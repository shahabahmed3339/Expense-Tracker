"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { api } from "@/lib/trpc";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import {
  isProfileImageDataUrl,
  isRemoteImageUrl,
  resizeProfileImageToDataUrl,
} from "@/lib/profile/image";
import { getPasswordValidationMessage, validatePassword } from "@/lib/auth/password";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const utils = api.useUtils();
  const { data: profile, isLoading, error } = api.profile.me.useQuery();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageValue, setImageValue] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadedImageLabel, setUploadedImageLabel] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setName(profile.name ?? "");
    setEmail(profile.email);
    setImageValue(profile.image ?? "");
    setImageUrlInput(profile.image && isRemoteImageUrl(profile.image) ? profile.image : "");
    if (uploadedImageLabel === "" || uploadedImageLabel === "Stored uploaded image") {
      setUploadedImageLabel(profile.image && isProfileImageDataUrl(profile.image) ? "Stored uploaded image" : "");
    }
    setVerificationEmail(profile.emailVerified ? "" : profile.email);
  }, [profile, uploadedImageLabel]);

  const updateProfile = api.profile.update.useMutation({
    onSuccess: async (nextProfile) => {
      await utils.profile.me.invalidate();
      await updateSession({
        name: nextProfile.name,
        email: nextProfile.email,
        image: nextProfile.image,
      });

      setVerificationEmail(nextProfile.emailVerified ? "" : nextProfile.email);
      setImageValue(nextProfile.image ?? "");
      setImageUrlInput(nextProfile.image && isRemoteImageUrl(nextProfile.image) ? nextProfile.image : "");
      setUploadedImageLabel(nextProfile.image && isProfileImageDataUrl(nextProfile.image) ? "Stored uploaded image" : "");

      if (nextProfile.verificationRequired) {
        toast.success("Profile updated. Please verify your new email address.");
      } else {
        toast.success("Profile updated");
      }
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const changePassword = api.profile.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const setOtpEnabled = api.profile.setOtpEnabled.useMutation({
    onSuccess: async () => {
      await utils.profile.me.invalidate();
      toast.success("Login OTP setting updated");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const deleteAccount = api.profile.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success("Account deleted");
      await signOut({ callbackUrl: "/signup" });
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  async function handleImageUpload(file: File | null) {
    if (!file) {
      setUploadedImageLabel("");
      return;
    }

    setIsUploadingImage(true);
    try {
      const dataUrl = await resizeProfileImageToDataUrl(file);
      setImageValue(dataUrl);
      setImageUrlInput("");
      // uploadedImageLabel is already set in onChange
      toast.success("Image prepared for saving");
    } catch (uploadError) {
      setUploadedImageLabel("");
      toast.error(uploadError instanceof Error ? uploadError.message : "Unable to process image");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function resendVerification() {
    if (!verificationEmail) return;

    setResendingVerification(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Unable to resend verification email");
        return;
      }
      toast.success("Verification email resent");
    } catch {
      toast.error("Network error");
    } finally {
      setResendingVerification(false);
    }
  }

  function clearImage() {
    setImageValue("");
    setImageUrlInput("");
    setUploadedImageLabel("");
  }

  if (isLoading) return <Loader />;
  if (error || !profile) return <ErrorState message={error?.message ?? "Unable to load profile"} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Manage your account, security, avatar, and authentication settings.</p>
      </div>

      <div className="motion-card flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <Avatar
          name={name || profile.name || session?.user?.name}
          image={imageValue || profile.image || session?.user?.image}
          size="lg"
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{name || profile.name || "Unnamed user"}</p>
          <p className="truncate text-sm text-[var(--muted)]">{email || profile.email}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {profile.emailVerified ? "Email verified" : "Email not verified"} - Joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
          {verificationEmail ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-500">
                Verification pending for {verificationEmail}
              </span>
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={resendVerification}
                disabled={resendingVerification}
                aria-label="Resend verification email"
                title="Resend verification email"
              >
                {resendingVerification ? "Resending..." : "Resend verification"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="motion-card space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div>
            <h2 className="text-sm font-medium text-[var(--muted)]">Profile details</h2>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Name</label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">Changing your email will send a new verification link and require reverification.</p>
          </div>
          <div className="space-y-3 rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Profile image URL</label>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                value={imageUrlInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setImageUrlInput(nextValue);
                  setUploadedImageLabel("");
                  setImageValue(nextValue.trim());
                }}
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Or upload image</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  id="profile-image-upload"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      setUploadedImageLabel(file.name);
                    }
                    void handleImageUpload(file);
                    event.currentTarget.value = "";
                  }}
                />
                <label
                  htmlFor="profile-image-upload"
                  className="inline-flex cursor-pointer items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm hover:bg-[var(--nav-hover)]"
                >
                  Choose file
                </label>
                {uploadedImageLabel ? (
                  <span className="text-xs text-[var(--muted)]">Selected: {uploadedImageLabel}</span>
                ) : (
                  <span className="text-xs text-[var(--muted)]">No file chosen</span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Uploads are stored in the database as base64 and resized to fit within 100 x 100 pixels.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={clearImage}>
                Remove image
              </Button>
              {isUploadingImage ? <span className="text-xs text-[var(--muted)]">Preparing image...</span> : null}
            </div>
          </div>

          <Button
            onClick={() =>
              updateProfile.mutate({
                name,
                email,
                image: imageValue.trim() ? imageValue.trim() : null,
              })
            }
            disabled={updateProfile.isPending || isUploadingImage}
          >
            {updateProfile.isPending ? "Saving..." : "Save profile"}
          </Button>
        </section>

        <section className="motion-card space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div>
            <h2 className="text-sm font-medium text-[var(--muted)]">Security</h2>
          </div>
          <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Email OTP on login</p>
                <p className="text-xs text-[var(--muted)]">Require a 2-minute email code after password sign-in.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={profile.otpEnabled}
                  onChange={(event) => setOtpEnabled.mutate({ enabled: event.target.checked })}
                />
                {profile.otpEnabled ? "On" : "Off"}
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Current password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-16 text-sm"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
                onClick={() => setShowCurrentPassword((current) => !current)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                title={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">New password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-16 text-sm"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
                onClick={() => setShowNewPassword((current) => !current)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                title={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            {newPassword && (
              <ul className="mt-2 space-y-1">
                <li className="text-xs" data-pass={validatePassword(newPassword).checks.minLength}>
                  <span className="text-[var(--muted)]">✓</span> At least 8 characters
                </li>
                <li className="text-xs" data-pass={validatePassword(newPassword).checks.lowercase}>
                  <span className="text-[var(--muted)]">✓</span> At least 1 lowercase letter
                </li>
                <li className="text-xs" data-pass={validatePassword(newPassword).checks.uppercase}>
                  <span className="text-[var(--muted)]">✓</span> At least 1 uppercase letter
                </li>
                <li className="text-xs" data-pass={validatePassword(newPassword).checks.number}>
                  <span className="text-[var(--muted)]">✓</span> At least 1 number
                </li>
                <li className="text-xs" data-pass={validatePassword(newPassword).checks.special}>
                  <span className="text-[var(--muted)]">✓ Special character</span>
                </li>
              </ul>
            )}
            {newPassword && getPasswordValidationMessage(newPassword) && (
              <p className="mt-2 text-xs text-red-500">{getPasswordValidationMessage(newPassword)}</p>
            )}
          </div>
          <Button
            onClick={() => {
              const passwordError = getPasswordValidationMessage(newPassword);
              if (passwordError) {
                toast.error(passwordError);
                return;
              }
              changePassword.mutate({ currentPassword, newPassword });
            }}
            disabled={changePassword.isPending || !currentPassword || !newPassword || !validatePassword(newPassword).isValid}
          >
            {changePassword.isPending ? "Saving..." : "Change password"}
          </Button>
        </section>
      </div>

      <section className="motion-card space-y-4 rounded-xl border border-red-400/40 bg-[var(--card)] p-4">
        <div>
          <h2 className="text-sm font-medium text-red-400">Danger zone</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Deleting your account will permanently remove budgets, expenses, splits, categories, people, and loans.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--muted)]">Current password</label>
          <div className="relative">
            <input
              type={showDeletePassword ? "text" : "password"}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-16 text-sm"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder="Required for password accounts"
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
              onClick={() => setShowDeletePassword((current) => !current)}
              aria-label={showDeletePassword ? "Hide password" : "Show password"}
              title={showDeletePassword ? "Hide password" : "Show password"}
            >
              {showDeletePassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <Button onClick={() => setDeleteOpen(true)}>Delete account</Button>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete account?"
        description="This action is permanent and cannot be undone."
        confirmText="Delete account"
        tone="danger"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteAccount.mutate({ currentPassword: deletePassword.trim() || null })}
      />
    </div>
  );
}
