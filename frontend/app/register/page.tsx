"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const initial = {
  fullName: "",
  rollNumber: "",
  department: "Computer Engineering",
  academicYear: "FE",
  passoutYear: "",
  mobileNumber: "",
  email: "",
  gender: "Male",
  dateOfBirth: "",
  bloodGroup: "",
  password: "",
  confirmPassword: "",
  profilePhotoUrl: "",
  studentIdCardUrl: "",
};

const departments = [
  "Computer Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "Automobile Engineering",
  "Instrumentation & Control Engineering",
  "Electronics & Telecommunication Engineering",
];

const academicYears = ["FE", "SE", "TE", "BE"];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initial);
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string>("");
  const [idFile, setIdFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const handleProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      const url = URL.createObjectURL(file);
      setProfilePreview(url);
    }
  };

  const handleIdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFile(file);
      const url = URL.createObjectURL(file);
      setIdPreview(url);
    }
  };

  // Cloudinary direct unsigned upload helper
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
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || "Image upload failed");
    }

    const data = await res.json();
    return data.secure_url;
  }

  // Basic step validation
  function validateStep(currentStep: number) {
    setError("");
    if (currentStep === 1) {
      if (!form.fullName || !form.email || !form.mobileNumber) {
        setError("Please fill out all required personal fields (Name, Email, Mobile). ");
        return false;
      }
      if (!/^\d{10}$/.test(form.mobileNumber)) {
        setError("Mobile number must be exactly 10 digits.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!form.rollNumber || !form.department || !form.academicYear || !form.passoutYear) {
        setError("Please fill out all required academic and account fields.");
        return false;
      }
      if (form.passoutYear.length !== 4 || !/^\d{4}$/.test(form.passoutYear)) {
        setError("Passout year must be a valid 4-digit year.");
        return false;
      }
      const year = Number(form.passoutYear);
      const currentYear = new Date().getFullYear();
      if (year < currentYear || year > currentYear + 4) {
        setError(`Passout year must be between ${currentYear} and ${currentYear + 4}.`);
        return false;
      }
      if (!form.password || !form.confirmPassword) {
        setError("Please fill out credentials.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (validateStep(step)) {
      setStep((s) => Math.min(3, s + 1));
    }
  }

  function prevStep() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!validateStep(3)) return;

    setLoading(true);
    try {
      let profilePhotoUrl = "";
      let studentIdCardUrl = "";

      if (profileFile) {
        profilePhotoUrl = await uploadToCloudinary(profileFile);
      }

      if (idFile) {
        studentIdCardUrl = await uploadToCloudinary(idFile);
      }

      const { confirmPassword, ...payload } = form;

      const res = await api("/api/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          ...payload,
          confirmPassword,
          profilePhotoUrl,
          collegeIdUrl: studentIdCardUrl ? studentIdCardUrl : undefined,
          studentIdCardUrl,
        }),
      });

      setSuccess(`Account registered successfully! Athlete ID: ${res.uniqueId} — save it, you'll need it to log in. ${res.message}`);
      setTimeout(() => router.push(`/login?registeredId=${res.uniqueId}`), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12 flex justify-center items-center">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow Decor */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative">
          <Link href="/" className="text-xs text-white/50 hover:text-white transition-colors">
            ← Back to home
          </Link>
          <h1 className="font-display text-3xl font-bold mt-4 mb-2 tracking-tight">
            Register Athlete Account
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Create your account to start tracking attendance, checking workouts, and climbing the leaderboards.
          </p>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between text-xs font-semibold text-white/50 mb-2">
              <span>Step {step} of 3</span>
              <span>{Math.round(((step - 1) / 2) * 100)}% Complete</span>
            </div>
            <div className="h-1.5 w-full bg-surface border border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue to-gold transition-all duration-300"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6 animate-pulse">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">
              {success}
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
            {/* STEP 1: PERSONAL INFO */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-base text-gold border-b border-border pb-2 mb-4">
                  Step 1: Personal Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field
                    label="Full Name"
                    value={form.fullName}
                    onChange={(v) => update("fullName", v)}
                    required
                    placeholder="John Doe"
                  />
                  <Field
                    label="Email Address"
                    type="email"
                    value={form.email}
                    onChange={(v) => update("email", v)}
                    required
                    placeholder="john.doe@example.com"
                  />
                  <Field
                    label="Mobile Number"
                    value={form.mobileNumber}
                    onChange={(v) => update("mobileNumber", v)}
                    required
                    placeholder="9876543210"
                  />
                  <label className="block">
                    <span className="label">Gender</span>
                    <select
                      className="input-field appearance-none bg-surface"
                      value={form.gender}
                      onChange={(e) => update("gender", e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <Field
                    label="Date of Birth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(v) => update("dateOfBirth", v)}
                  />
                  <Field
                    label="Blood Group"
                    value={form.bloodGroup}
                    onChange={(v) => update("bloodGroup", v)}
                    placeholder="e.g. O+"
                  />
                  
                </div>
              </div>
            )}

            {/* STEP 2: COLLEGE + ACCOUNT INFO */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-base text-gold border-b border-border pb-2 mb-4">
                  Step 2: Academic + Account Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  
                  <Field
                    label="Roll Number"
                    value={form.rollNumber}
                    onChange={(v) => update("rollNumber", v)}
                    required
                    placeholder="26CS45"
                  />
                  <label className="block">
                    <span className="label">Department</span>
                    <select
                      className="input-field appearance-none bg-surface"
                      value={form.department}
                      onChange={(e) => update("department", e.target.value)}
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">Academic Year</span>
                    <select
                      className="input-field appearance-none bg-surface"
                      value={form.academicYear}
                      onChange={(e) => update("academicYear", e.target.value)}
                    >
                      {academicYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Passout Year"
                    value={form.passoutYear}
                    onChange={(v) => update("passoutYear", v)}
                    required
                    placeholder="2028"
                  />
                  
                  
                  <Field
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={(v) => update("password", v)}
                    required
                  />
                  <Field
                    label="Confirm Password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(v) => update("confirmPassword", v)}
                    required
                  />
                </div>
              </div>
            )}

            {/* STEP 3: OPTIONAL UPLOADS */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-base text-gold border-b border-border pb-2 mb-4">
                  Step 3: Optional Verification Uploads
                </h3>
                <p className="text-xs text-white/40 mb-6">
                  Upload your college ID and profile photo now, or skip this step and do it later from your profile page.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="stat-card flex flex-col items-center justify-between min-h-[220px]">
                    <div className="w-full text-center">
                      <span className="label mb-2">Profile Photo</span>
                      {profilePreview ? (
                        <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border border-gold mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={profilePreview} alt="Profile Preview" className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 mx-auto rounded-full bg-surface border border-border flex items-center justify-center text-white/30 mb-3 text-2xl">
                          👤
                        </div>
                      )}
                    </div>
                    <label className="w-full">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileFile}
                        className="hidden"
                      />
                      <span className="btn-primary text-xs py-2 block text-center cursor-pointer border border-blue bg-blue/10 hover:bg-blue/20">
                        {profilePreview ? "Change Photo" : "Upload Portrait"}
                      </span>
                    </label>
                  </div>

                  <div className="stat-card flex flex-col items-center justify-between min-h-[220px]">
                    <div className="w-full text-center">
                      <span className="label mb-2">Student ID Card</span>
                      {idPreview ? (
                        <div className="relative w-full h-24 mx-auto rounded-lg overflow-hidden border border-gold mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={idPreview} alt="ID Preview" className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <div className="w-full h-20 mx-auto rounded-lg bg-surface border border-border flex items-center justify-center text-white/30 mb-3 text-3xl">
                          🪪
                        </div>
                      )}
                    </div>
                    <label className="w-full">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdFile}
                        className="hidden"
                      />
                      <span className="btn-gold text-xs py-2 block text-center cursor-pointer border border-gold bg-gold/10 hover:bg-gold/20">
                        {idPreview ? "Change ID Photo" : "Upload ID Photo"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* NAVIGATION BUTTONS */}
            <div className="flex justify-between items-center pt-6 border-t border-border mt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-border text-white/60 hover:text-white hover:bg-surface transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-gold px-6 py-2.5 text-sm"
                >
                  Continue
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-gold px-6 py-2.5 text-sm bg-gradient-to-r from-gold to-yellow-600 hover:brightness-110 shadow-lg shadow-gold/15"
                  >
                    {loading ? "Registering..." : "Finish Registration"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-primary px-6 py-2.5 text-sm text-white/80 border border-white/20 hover:text-white hover:bg-surface"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </div>
          </form>

          <p className="text-sm text-white/40 mt-8 text-center">
            Already registered?{" "}
            <Link href="/login" className="text-blue-light hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      <input
        className="input-field"
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
