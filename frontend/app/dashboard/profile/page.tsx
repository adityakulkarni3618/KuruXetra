"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    mobileNumber: "",
    gender: "Male",
    dateOfBirth: "",
    bloodGroup: "",
    department: "Computer Engineering",
    academicYear: "FE",
    passoutYear: "",
    fitnessGoal: "",
  });

  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [collegeIdUrl, setCollegeIdUrl] = useState("");
  const [profilePreview, setProfilePreview] = useState("");
  const [idPreview, setIdPreview] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [badges, setBadges] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  // Privacy Confirmation Modal
  const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false);
  const [privacyPendingVal, setPrivacyPendingVal] = useState<boolean | null>(null);

  // Status/Stories State (WhatsApp Style)
  const [statusMedia, setStatusMedia] = useState("");
  const [statusCaption, setStatusCaption] = useState("");
  const [statusFile, setStatusFile] = useState<File | null>(null);
  const [postingStatus, setPostingStatus] = useState(false);

  const departments = [
    "Computer Engineering",
    "Information Technology",
    "Electronics & Telecommunication",
    "Mechanical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
  ];
  const academicYears = ["FE", "SE", "TE", "BE"];
  const genders = ["Male", "Female", "Other"];

  async function loadData() {
    try {
      const me = await api("/api/auth/me");
      setForm({
        fullName: me.fullName || "",
        mobileNumber: me.mobileNumber || "",
        gender: me.gender || "Male",
        dateOfBirth: me.dateOfBirth ? me.dateOfBirth.slice(0, 10) : "",
        bloodGroup: me.bloodGroup || "",
        department: me.department || "Computer Engineering",
        academicYear: me.academicYear || "FE",
        passoutYear: me.passoutYear ? String(me.passoutYear) : "",
        fitnessGoal: me.fitnessGoal || "",
      });
      setProfilePhotoUrl(me.profilePhotoUrl || "");
      setCollegeIdUrl(me.collegeIdUrl || "");
      setProfilePreview(me.profilePhotoUrl || "");
      setIdPreview(me.collegeIdUrl || "");
      setIsPublic(me.isPublic !== false);

      const bList = await api(`/api/users/${me.id}/badges`);
      setBadges(bList);
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const update = (key: string, val: string) => {
    setForm({ ...form, [key]: val });
  };

  async function uploadToCloudinary(file: File): Promise<string> {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "ksms_preset");
    const res = await fetch("https://api.cloudinary.com/v1_1/dczf74fhl/image/upload", {
      method: "POST",
      body: data,
    });
    if (!res.ok) throw new Error("Image upload failed");
    const json = await res.json();
    return json.secure_url;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await api("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setMessage("Profile details updated successfully.");
      refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  // Confirm and Apply Privacy Settings
  async function applyPrivacyChange() {
    if (privacyPendingVal === null) return;
    setError("");
    setMessage("");
    try {
      await api("/api/social/me/privacy", {
        method: "PATCH",
        body: JSON.stringify({ isPublic: privacyPendingVal }),
      });
      setIsPublic(privacyPendingVal);
      setMessage(`Account privacy successfully set to ${privacyPendingVal ? "Public" : "Private"}.`);
    } catch (err: any) {
      setError(err.message || "Failed to save privacy settings");
    } finally {
      setShowPrivacyConfirm(false);
      setPrivacyPendingVal(null);
    }
  }

  // WhatsApp Status Upload
  async function handlePostStatus(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setPostingStatus(true);
    try {
      let finalUrl = statusMedia;
      if (statusFile) {
        finalUrl = await uploadToCloudinary(statusFile);
      }
      await api("/api/social/status", {
        method: "POST",
        body: JSON.stringify({ mediaUrl: finalUrl || undefined, caption: statusCaption || undefined }),
      });
      setMessage("Status story uploaded successfully! It will disappear in 24 hours.");
      setStatusMedia("");
      setStatusCaption("");
      setStatusFile(null);
    } catch (err: any) {
      setError(err.message || "Status upload failed.");
    } finally {
      setPostingStatus(false);
    }
  }

  // Separate File Upload actions
  async function handleProfileFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const url = await uploadToCloudinary(file);
      await api("/api/users/me/profile-picture", {
        method: "PATCH",
        body: JSON.stringify({ url }),
      });
      setProfilePhotoUrl(url);
      setProfilePreview(url);
      setMessage("Profile photo updated successfully.");
      refresh();
    } catch (err: any) {
      setError(err.message || "Photo upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleIdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const url = await uploadToCloudinary(file);
      await api("/api/users/me/college-id", {
        method: "PATCH",
        body: JSON.stringify({ url }),
      });
      setCollegeIdUrl(url);
      setIdPreview(url);
      setMessage("College ID document updated successfully.");
      refresh();
    } catch (err: any) {
      setError(err.message || "College ID upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">My Profile</h1>
      <p className="text-white/50 text-sm mb-8">Update your personal data, media documents, and configure account settings.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      {/* ── Dynamic Media Configuration Cards (Horizontal Row) ── */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Profile Photo Card */}
        <div className="stat-card flex flex-col justify-between hover:border-gold/20 transition-all">
          <div>
            <h3 className="font-semibold text-white mb-2">Profile Photo</h3>
            {profilePreview ? (
              <img src={profilePreview} className="w-16 h-16 rounded-full object-cover mb-3 border border-white/10" alt="Avatar" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/5 mb-3 border border-dashed border-white/20 flex items-center justify-center text-[10px] text-white/30">No Pic</div>
            )}
          </div>
          <div>
            <label className="btn-gold text-xs block text-center cursor-pointer py-2">
              Change Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleProfileFileChange} />
            </label>
            {profilePhotoUrl && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Are you sure you want to delete your profile photo?")) return;
                  await api("/api/users/me/profile-picture", { method: "PATCH", body: JSON.stringify({ url: "" }) });
                  setProfilePhotoUrl("");
                  setProfilePreview("");
                  setMessage("Profile picture removed.");
                }}
                className="text-[10px] text-red-400 hover:underline mt-2 block text-center w-full"
              >
                Delete Photo
              </button>
            )}

            {/* Badges Earned (relocated here) */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs font-semibold text-white/50 mb-2 uppercase">My Badges ({badges.length})</p>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {badges.map((ub) => (
                  <div key={ub.id} className="p-2 rounded bg-surface border border-gold/15 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-gold">{ub.badge.name}</p>
                    <p className="text-[8px] text-white/60 leading-tight">{ub.badge.description}</p>
                  </div>
                ))}
                {badges.length === 0 && (
                  <p className="text-[10px] text-white/40 italic">No badges earned yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Status Card */}
        <div className="stat-card flex flex-col justify-between hover:border-gold/20 transition-all">
          <div>
            <h3 className="font-semibold text-white mb-2">Add Status Update</h3>
            <p className="text-xs text-white/50 mb-3">Upload temporary photo/video statuses visible on the Leaderboard tab.</p>
          </div>
          <form onSubmit={handlePostStatus} className="space-y-2">
            <input
              type="text"
              placeholder="Caption text"
              className="input-field text-xs py-1.5 px-3"
              value={statusCaption}
              onChange={(e) => setStatusCaption(e.target.value)}
            />
            <label className="btn-primary text-xs block text-center cursor-pointer py-1.5 bg-white/10 hover:bg-white/15">
              {statusFile ? "✓ File Chosen" : "Attach Photo/Video"}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setStatusFile(e.target.files?.[0] || null)} />
            </label>
            <button type="submit" disabled={postingStatus} className="btn-gold text-xs w-full py-1.5">
              {postingStatus ? "Uploading..." : "Publish Status"}
            </button>
          </form>
        </div>

        {/* College ID Card */}
        <div className="stat-card flex flex-col justify-between hover:border-gold/20 transition-all">
          <div>
            <h3 className="font-semibold text-white mb-2">College Student ID</h3>
            {idPreview ? (
              <img src={idPreview} className="w-full h-16 object-cover rounded-lg mb-3 border border-white/10" alt="ID Document" />
            ) : (
              <div className="w-full h-16 rounded-lg bg-white/5 mb-3 border border-dashed border-white/20 flex items-center justify-center text-[10px] text-white/30">No ID Attached</div>
            )}
          </div>
          <div>
            <label className="btn-gold text-xs block text-center cursor-pointer py-2">
              Update ID Document
              <input type="file" accept="image/*" className="hidden" onChange={handleIdFileChange} />
            </label>
            {collegeIdUrl && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Are you sure you want to delete your college ID document?")) return;
                  await api("/api/users/me/college-id", { method: "PATCH", body: JSON.stringify({ url: "" }) });
                  setCollegeIdUrl("");
                  setIdPreview("");
                  setMessage("College ID removed.");
                }}
                className="text-[10px] text-red-400 hover:underline mt-2 block text-center w-full"
              >
                Delete Document
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Relocated Explore Widgets (Badges & Sports) ── */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Explore Badges */}
        <div className="stat-card hover:border-gold/20 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white mb-2">Explore Badges</h3>
            <p className="text-xs text-white/50 mb-3">View all available college badges and learn how you can earn them.</p>
          </div>
          <Link href="/dashboard/leaderboard" className="btn-gold text-xs block text-center py-2">
            Explore Available Badges &rarr;
          </Link>
        </div>

        {/* Explore Sports Card */}
        <div className="stat-card hover:border-gold/20 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white mb-2">Explore Sports</h3>
            <p className="text-xs text-white/50 mb-3">Browse all available sports teams at Kuruxetra and check practice times.</p>
          </div>
          <Link href="/dashboard/sports" className="btn-gold text-xs block text-center py-2">
            Browse Sports & Teams &rarr;
          </Link>
        </div>
      </div>

      {/* ── Settings Form ── */}
      <form onSubmit={saveProfile} className="stat-card grid gap-4 mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Full Name</span>
            <input className="input-field" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Mobile Number</span>
            <input className="input-field" value={form.mobileNumber} onChange={(e) => update("mobileNumber", e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Gender</span>
            <select className="input-field" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              {genders.map((gender) => (
                <option key={gender} value={gender}>{gender}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Date of Birth</span>
            <input className="input-field" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Department</span>
            <select className="input-field" value={form.department} onChange={(e) => update("department", e.target.value)}>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Academic Year</span>
            <select className="input-field" value={form.academicYear} onChange={(e) => update("academicYear", e.target.value)}>
              {academicYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Passout Year</span>
            <input className="input-field" type="number" value={form.passoutYear} onChange={(e) => update("passoutYear", e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Blood Group</span>
            <input className="input-field" value={form.bloodGroup} onChange={(e) => update("bloodGroup", e.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="label">Fitness Goal</span>
            <textarea
              className="input-field min-h-[120px]"
              value={form.fitnessGoal}
              onChange={(e) => update("fitnessGoal", e.target.value)}
            />
          </label>
        </div>

        {/* Confirm and switch Privacy Toggle */}
        <div className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Account Privacy Settings</p>
            <p className="text-xs text-white/50">Configure whether profiles are public or private database searches.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPrivacyPendingVal(!isPublic);
              setShowPrivacyConfirm(true);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPublic ? "bg-gold" : "bg-white/10"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPublic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={loading} className="btn-gold">
            Save Details
          </button>
        </div>
      </form>



      {/* ── Privacy Confirmation Modal (Instagram details) ── */}
      {showPrivacyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-lg text-white">
              Confirm Privacy Switch to {privacyPendingVal ? "Public" : "Private"}?
            </h3>
            
            {privacyPendingVal ? (
              <p className="text-xs text-white/70 leading-relaxed">
                📢 **Switching to a Public Account:**
                <br />
                - Any athlete or sports secretary can search your name, unique ID, or department.
                <br />
                - Your profile posts, workout achievements, history, and contact details will be fully visible.
                <br />
                - Other players can interact with, comment on, like, and share your posts.
              </p>
            ) : (
              <p className="text-xs text-white/70 leading-relaxed">
                🔒 **Switching to a Private Account:**
                <br />
                - Only your profile photo, name, and Athletic ID will be visible in search databases (like Instagram).
                <br />
                - All contact details, department, GPA roll number, workout logs, and posts wall will be locked/hidden.
                <br />
                - Admin and Sports Secretaries will still retain structural read access to approve logs.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPrivacyConfirm(false);
                  setPrivacyPendingVal(null);
                }}
                className="btn-back flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyPrivacyChange}
                className="btn-gold flex-1"
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
