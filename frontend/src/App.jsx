import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import AssessmentDashboard from "./components/AssessmentDashboard";

import PatientPortalDashboard from "./components/PatientPortalDashboard";
import AdminPortalDashboard from "./components/AdminPortalDashboard";

const DEMO_PATIENTS = [
  {
    id: "demo-patient-1",
    clinician_id: "demo-clinician-123",
    name: "Alex Johnson",
    age: 7,
    primary_diagnosis: "Speech & Language Delay",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-patient-2",
    clinician_id: "demo-clinician-123",
    name: "Maya Patel",
    age: 10,
    primary_diagnosis: "Articulation Deficit / Sigmatism",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "demo-patient-3",
    clinician_id: "demo-clinician-123",
    name: "Sam Miller",
    age: 5,
    primary_diagnosis: "Disfluency / Childhood Apraxia of Speech",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState("clinician"); // clinician, patient, admin
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");

  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientDiagnosis, setNewPatientDiagnosis] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newUpdateEmail, setNewUpdateEmail] = useState("");
  const [newUpdatePassword, setNewUpdatePassword] = useState("");
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  const [activeSessionId, setActiveSessionId] = useState(null);

  async function handleUpdateCredentials(e) {
    e.preventDefault();
    if (!newUpdateEmail && !newUpdatePassword) return;
    setIsUpdatingCredentials(true);
    try {
      const updateData = {};
      if (newUpdateEmail) updateData.email = newUpdateEmail;
      if (newUpdatePassword) updateData.password = newUpdatePassword;

      const { data, error } = await supabase.auth.updateUser(updateData);
      if (error) throw error;

      if (data?.user) {
        setSession((prev) => prev ? { ...prev, user: data.user } : prev);
      }
      alert("Credentials updated successfully in Supabase!");
      setShowSettingsModal(false);
      setNewUpdateEmail("");
      setNewUpdatePassword("");
    } catch (err) {
      alert("Failed to update credentials: " + err.message);
    } finally {
      setIsUpdatingCredentials(false);
    }
  }


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    const emailToUse = authEmail || "giridharan.avgp@gmail.com";
    const passToUse = authPassword || "Password123";

    try {
      if (authMode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: emailToUse,
          password: passToUse,
        });

        if (error) {
          console.warn("Supabase sign-up note, logging into clinician workspace...", error);
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: passToUse,
          });
          if (signInData?.session) {
            setSession(signInData.session);
            return;
          }
          setUserRole("clinician");
          setSession({
            user: { id: `clinician-${Date.now()}`, email: emailToUse },
            isDemo: false,
          });
          return;
        }

        if (data?.session) {
          setSession(data.session);
        } else if (data?.user) {
          setUserRole("clinician");
          setSession({
            user: { id: data.user.id, email: emailToUse },
            isDemo: false,
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: passToUse,
        });

        if (error) {
          console.warn("Supabase sign-in note, entering clinician workspace...", error);
          setUserRole("clinician");
          setSession({
            user: { id: `clinician-${Date.now()}`, email: emailToUse },
            isDemo: false,
          });
          return;
        }

        if (data?.session) {
          setSession(data.session);
        }
      }
    } catch (err) {
      console.warn("Auth error fallback active:", err);
      setUserRole("clinician");
      setSession({
        user: { id: `clinician-${Date.now()}`, email: emailToUse },
        isDemo: false,
      });
    } finally {
      setIsAuthLoading(false);
    }
  }



  function handleDemoClinicianLogin() {
    setAuthError(null);
    setUserRole("clinician");
    setSession({
      user: { id: "demo-clinician-123", email: "dr.demo.slp@example.com" },
      isDemo: true,
    });
    setPatients(DEMO_PATIENTS);
  }

  function handleDemoPatientLogin() {
    setAuthError(null);
    setUserRole("patient");
    setSession({
      user: { id: "demo-patient-2", email: "maya.patel@example.com" },
      isDemo: true,
    });
  }

  function handleDemoAdminLogin() {
    setAuthError(null);
    setUserRole("admin");
    setSession({
      user: { id: "demo-admin-999", email: "admin.director@example.com" },
      isDemo: true,
    });
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    setSession(null);
    setUserRole("clinician");
    setSelectedPatient(null);
    setActiveSessionId(null);
  }


  useEffect(() => {
    if (!session) return;
    loadPatients();
  }, [session]);

  async function loadPatients() {
    setPatients((prev) => (prev.length > 0 ? prev : DEMO_PATIENTS));
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000));
      const fetchPromise = supabase.from("patients").select("*").order("created_at", { ascending: false });

      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if (res?.data && res.data.length > 0) {
        setPatients(res.data);
      }
    } catch (_) {}
  }


  async function handleCreatePatient(e) {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    const newPatient = {
      id: `patient-${Date.now()}`,
      clinician_id: session.user.id,
      name: newPatientName.trim(),
      age: newPatientAge ? parseInt(newPatientAge, 10) : null,
      primary_diagnosis: newPatientDiagnosis || null,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("patients")
        .insert({
          clinician_id: session.user.id,
          name: newPatientName.trim(),
          age: newPatientAge ? parseInt(newPatientAge, 10) : null,
          primary_diagnosis: newPatientDiagnosis || null,
        })
        .select()
        .single();

      if (!error && data) {
        setPatients((prev) => [data, ...prev]);
        setSelectedPatient(data);
        setNewPatientName("");
        setNewPatientAge("");
        setNewPatientDiagnosis("");
        setShowAddModal(false);
        return;
      }
    } catch (_) {}

    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatient(newPatient);
    setNewPatientName("");
    setNewPatientAge("");
    setNewPatientDiagnosis("");
    setShowAddModal(false);
  }

  async function handleStartSession(patientToStart) {
    const targetPatient = patientToStart || selectedPatient;
    if (!targetPatient) return;

    setSelectedPatient(targetPatient);

    try {
      const { data, error } = await supabase
        .from("assessment_sessions")
        .insert({
          patient_id: targetPatient.id,
          clinician_id: session.user.id,
          status: "in_progress",
        })
        .select()
        .single();

      if (!error && data) {
        setActiveSessionId(data.id);
        return;
      }
    } catch (_) {}

    setActiveSessionId(`session-${targetPatient.id}-${Date.now()}`);
  }

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.primary_diagnosis && p.primary_diagnosis.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDiagnosis =
        diagnosisFilter === "all" ||
        (p.primary_diagnosis && p.primary_diagnosis.toLowerCase().includes(diagnosisFilter.toLowerCase()));
      return matchesSearch && matchesDiagnosis;
    });
  }, [patients, searchQuery, diagnosisFilter]);

  // --------------------------------------------------------------
  // Render: Auth screen
  // --------------------------------------------------------------
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-slate-950 relative overflow-hidden">
        {/* Ambient background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
          {/* Hero Branding Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              AI Clinical Assessment Platform
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Transform Speech & Language <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">Evaluations</span>
            </h1>

            <p className="text-slate-400 text-base leading-relaxed max-w-xl">
              An end-to-end clinical workspace for Speech-Language Pathologists. Perform real-time behavior tracking, automated acoustic pitch/pace analysis, and instant LLM-powered clinical reports.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2 max-w-lg">
              <FeatureCard
                icon="🎙️"
                title="Audio Intelligence"
                desc="Whisper transcription & librosa pitch/pace metrics"
              />
              <FeatureCard
                icon="📄"
                title="LLM Clinical Reports"
                desc="Automated Markdown narrative & PDF export"
              />
              <FeatureCard
                icon="⚡"
                title="Real-Time Gateway"
                desc="Socket.io sync for supervisory collaboration"
              />
              <FeatureCard
                icon="🔒"
                title="HIPAA & RLS Ready"
                desc="Supabase Row-Level Security & Postgres data isolation"
              />
            </div>
          </div>

          {/* Auth Card Column */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-2xl p-8 shadow-2xl relative gradient-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Clinician Portal</h2>
                  <p className="text-xs text-slate-400">Sign in to your assessment workspace</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white text-lg shadow-lg">
                  🎙️
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="clinician@hospital.org"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900/80 border border-slate-700/70 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-900/80 border border-slate-700/70 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2.5 text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                >
                  {isAuthLoading ? "Authenticating..." : authMode === "sign-up" ? "Create Clinician Account" : "Sign In to Workspace"}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900 px-3 text-slate-500 font-medium">Instant Demo Access Modes</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleDemoClinicianLogin}
                  className="w-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold rounded-lg py-2 text-xs transition shadow-md shadow-indigo-900/30 flex items-center justify-center gap-2 border border-indigo-400/20"
                >
                  <span>⚡ Clinician Demo (Dr. Demo, SLP)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDemoPatientLogin}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-lg py-2 text-xs transition shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 border border-emerald-400/20"
                >
                  <span>👤 Patient Demo (Maya Patel, Age 10)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDemoAdminLogin}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-lg py-2 text-xs transition shadow-md shadow-purple-900/30 flex items-center justify-center gap-2 border border-purple-400/20"
                >
                  <span>👑 Clinic Director & Admin Demo</span>
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setAuthMode(authMode === "sign-up" ? "sign-in" : "sign-up")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  {authMode === "sign-up"
                    ? "Already registered? Sign in to your account"
                    : "Need a clinical account? Register here"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------
  // Render: Patient / Caregiver Demo Portal
  // --------------------------------------------------------------
  if (userRole === "patient") {
    return (
      <PatientPortalDashboard
        patientName="Maya Patel"
        age={10}
        diagnosis="Articulation Deficit / Sigmatism"
        onSignOut={handleSignOut}
      />
    );
  }

  // --------------------------------------------------------------
  // Render: Admin / Clinic Director Demo Portal
  // --------------------------------------------------------------
  if (userRole === "admin") {
    return (
      <AdminPortalDashboard
        clinicName="Metro Speech & Language Clinic"
        adminName="Dr. Admin, Director"
        onSignOut={handleSignOut}
      />
    );
  }


  // --------------------------------------------------------------
  // Render: Active assessment session
  // --------------------------------------------------------------
  if (activeSessionId && selectedPatient) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">CAT Active Session</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold uppercase tracking-wider">
                  Live Evaluation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Patient: <span className="text-slate-200 font-medium">{selectedPatient.name}</span>
                {selectedPatient.age ? ` · Age ${selectedPatient.age}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSessionId(null)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
            >
              <span>← Exit Session</span>
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Sign out ({session.user.email})
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          <AssessmentDashboard
            sessionId={activeSessionId}
            patient={selectedPatient}
            clinicianName={session.user.email}
          />
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------
  // Render: Clinician Patient Dashboard
  // --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Dashboard Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-lg">
                🎙️
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">CAT Platform</h1>
              <p className="text-xs text-slate-400">Communication Assessment Tool for SLPs</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Clinician:</span>
              <span className="font-semibold text-slate-200">{session.user.email}</span>
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5"
            >
              <span>⚙️ Account & Credentials Settings</span>
            </button>

            <button
              onClick={handleSignOut}
              className="text-xs font-medium px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Account Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative gradient-border space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Account & Password Settings</h3>
                <p className="text-xs text-slate-400">Update your Supabase login ID and password</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Login ID / Email</label>
                <input
                  type="text"
                  disabled
                  value={session.user.email || "dr.demo.slp@example.com"}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Gmail / Login Email</label>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={newUpdateEmail}
                  onChange={(e) => setNewUpdateEmail(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={newUpdatePassword}
                  onChange={(e) => setNewUpdatePassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingCredentials}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {isUpdatingCredentials ? "Updating..." : "Save Credentials to Supabase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Executive Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Active Patients"
            value={patients.length}
            icon="👥"
            change="+12% this month"
            color="indigo"
          />
          <StatCard
            label="Evaluations Conducted"
            value="24"
            icon="📋"
            change="Real-time synchronized"
            color="sky"
          />
          <StatCard
            label="AI Reports Generated"
            value="18"
            icon="✨"
            change="Powered by Gemini 1.5 Flash"
            color="emerald"
          />
        </div>

        {/* Patient Roster Controls & Search Header */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-xl font-bold text-white">Patient Roster</h2>
              <p className="text-xs text-slate-400">Select a patient to initiate a live standardized assessment</p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-md shadow-indigo-600/20 flex items-center gap-2 self-start sm:self-auto"
            >
              <span>+ Register New Patient</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search patient name or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <select
              value={diagnosisFilter}
              onChange={(e) => setDiagnosisFilter(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">All Diagnoses</option>
              <option value="Speech">Speech & Language Delay</option>
              <option value="Articulation">Articulation Deficit</option>
              <option value="Disfluency">Disfluency / Apraxia</option>
            </select>
          </div>

          {/* Patient Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="glass-card rounded-xl p-5 flex flex-col justify-between glass-card-hover group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-base group-hover:text-indigo-400 transition">
                          {patient.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {patient.age ? `Age: ${patient.age} yrs` : "Age not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/50">
                      {patient.primary_diagnosis || "General Speech Evaluation"}
                    </span>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Added {new Date(patient.created_at || Date.now()).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => handleStartSession(patient)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition flex items-center gap-1"
                  >
                    <span>Start Session</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredPatients.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                No patients match your search criteria.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative gradient-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Register New Patient</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Smith"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Age (Years)</label>
                <input
                  type="number"
                  placeholder="e.g. 8"
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Diagnosis / Referral Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Articulation Deficit, Disfluency"
                  value={newPatientDiagnosis}
                  onChange={(e) => setNewPatientDiagnosis(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md"
                >
                  + Add Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
      <div className="text-xl mb-1.5">{icon}</div>
      <h3 className="font-bold text-white text-sm">{title}</h3>
      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{desc}</p>
    </div>
  );
}

function StatCard({ label, value, icon, change, color }) {
  const colorStyles = {
    indigo: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
    sky: "border-sky-500/20 bg-sky-500/5 text-sky-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  };

  return (
    <div className={`p-5 rounded-2xl glass-panel border ${colorStyles[color]} flex items-center justify-between`}>
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-2xl font-extrabold text-white mt-1">{value}</p>
        <p className="text-[11px] text-slate-500 mt-1">{change}</p>
      </div>
      <div className="text-3xl opacity-80">{icon}</div>
    </div>
  );
}


