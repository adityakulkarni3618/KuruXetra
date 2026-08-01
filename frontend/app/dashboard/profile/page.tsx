"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const departments = [
  "Computer Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "Automobile Engineering",
  "Instrumentation & Control Engineering",
  "Electronics & Telecommunication Engineering",
];

const academicYears = ["FE", "SE", "TE", "BE"];

const genders = ["Male", "Female", "Other"];

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

  useEffect(() => {
    async function load() {
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
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      }
    }
    load();
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleIdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFile(file);
      setIdPreview(URL.createObjectURL(file));
    }
  };

  async function uploadToCloudinary(file: File): Promise<string> {
    const cloudName = "rw3wmwga";
    const uploadPreset = "ksms_uploads";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Image upload failed");
    }

    const data = await res.json();
    return data.secure_url;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const payload: any = {
        fullName: form.fullName,
        mobileNumber: form.mobileNumber,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || undefined,
        bloodGroup: form.bloodGroup || undefined,
        department: form.department,
        academicYear: form.academicYear,
        passoutYear: form.passoutYear ? Number(form.passoutYear) : undefined,
        fitnessGoal: form.fitnessGoal || undefined,
      };

      await api("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setMessage("Profile updated successfully.");
      refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function uploadPhoto() {
    setError("");
    setMessage("");
    if (!profileFile) {
      setError("Please choose a profile photo to upload.");
      return;
    }

    setLoading(true);
    try {
      const url = await uploadToCloudinary(profileFile);
      await api("/api/users/me/profile-picture", {
        method: "PATCH",
        body: JSON.stringify({ url }),
      });
      setProfilePhotoUrl(url);
      setProfilePreview(url);
      setProfileFile(null);
      setMessage("Profile photo uploaded successfully.");
      refresh();
    } catch (err: any) {
      setError(err.message || "Profile photo upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function uploadCollegeId() {
    setError("");
    setMessage("");
    if (!idFile) {
      setError("Please choose a college ID image to upload.");
      return;
    }

    setLoading(true);
    try {
      const url = await uploadToCloudinary(idFile);
      await api("/api/users/me/college-id", {
        method: "PATCH",
        body: JSON.stringify({ url }),
      });
      setCollegeIdUrl(url);
      setIdPreview(url);
      setIdFile(null);
      setMessage("College ID uploaded successfully.");
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
      <p className="text-white/50 text-sm mb-8">Update your athlete details, profile photo, and college ID documents.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <form onSubmit={saveProfile} className="stat-card grid gap-4 mb-10">
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.fullName} onChange={(v) => update("fullName", v)} required />
          <Input label="Mobile Number" value={form.mobileNumber} onChange={(v) => update("mobileNumber", v)} required />
          <label className="block">
            <span className="label">Gender</span>
            <select className="input-field" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              {genders.map((gender) => (
                <option key={gender} value={gender}>{gender}</option>
              ))}
            </select>
          </label>
          <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} />
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
          <Input label="Passout Year" type="number" value={form.passoutYear} onChange={(v) => update("passoutYear", v)} />
          <Input label="Blood Group" value={form.bloodGroup} onChange={(v) => update("bloodGroup", v)} />
          <label className="block md:col-span-2">
            <span className="label">Fitness Goal</span>
            <textarea
              className="input-field min-h-[120px]"
              value={form.fitnessGoal}
              onChange={(e) => update("fitnessGoal", e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-gold">
            Save profile
          </button>
        </div>
      </form>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3">Profile photo</h2>
          {profilePreview ? (
            <img src={profilePreview} alt="Profile preview" className="w-full h-56 object-cover rounded-lg mb-4" />
          ) : (
            <div className="border border-dashed border-border rounded-lg h-56 flex items-center justify-center text-white/40 mb-4">
              No photo uploaded yet.
            </div>
          )}
          <label className="block mb-4">
            <span className="label">Choose file</span>
            <input className="input-field" type="file" accept="image/*" onChange={handleProfileFile} />
          </label>
          <button type="button" onClick={uploadPhoto} disabled={loading} className="btn-gold">
            Upload profile photo
          </button>
        </div>

        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3">College ID</h2>
          {idPreview ? (
            <img src={idPreview} alt="College ID preview" className="w-full h-56 object-cover rounded-lg mb-4" />
          ) : (
            <div className="border border-dashed border-border rounded-lg h-56 flex items-center justify-center text-white/40 mb-4">
              No college ID uploaded yet.
            </div>
          )}
          <label className="block mb-4">
            <span className="label">Choose file</span>
            <input className="input-field" type="file" accept="image/*" onChange={handleIdFile} />
          </label>
          <button type="button" onClick={uploadCollegeId} disabled={loading} className="btn-gold">
            Upload college ID
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input-field"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}
