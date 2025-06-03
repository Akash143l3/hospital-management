"use client";
import React, { useState, useEffect } from "react";
import {
  User,
  Users,
  UserPlus,
  Calendar,
  Activity,
  Home,
  LogOut,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Bell,
  Menu,
  X,
  Stethoscope,
  Heart,
  Shield,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

// types.ts or at the top of page.tsx

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  user_type: "admin" | "doctor" | "patient";
}

interface Admin extends User {
  user_type: "admin";
  created_at: string;
}

interface Doctor extends User {
  user_type: "doctor";
  specialization: string;
  created_at: string;
}

interface Patient extends User {
  user_type: "patient";
  address?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  doctor_name: string;
  specialization: string;
  appointment_date: string;
  appointment_time: string;
  symptoms?: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  created_at: string;
}

interface DashboardStats {
  total_patients: number;
  total_doctors: number;
  today_appointments: number;
  total_appointments: number;
}

// --- Component Props Interfaces ---

interface AuthComponentProps {
  onLogin: (userData: User) => void;
}

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userType: "admin" | "doctor" | "patient";
}

interface ContentAreaProps {
  currentView: string;
  currentUser: User;
}

interface DashboardProps {
  currentUser: User;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

interface QuickActionButtonProps {
  icon: React.ElementType;
  text: string;
  onClick: () => void;
}

interface ActivityItemProps {
  text: string;
  time: string;
}

interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
}

interface AdminModalProps {
  admin: Admin | null;
  onClose: () => void;
  onSave: () => void;
}

interface DoctorModalProps {
  doctor: Doctor | null;
  onClose: () => void;
  onSave: () => void;
}

interface PatientModalProps {
  patient: Patient | null;
  onClose: () => void;
  onSave: () => void;
}

interface AppointmentModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onSave: () => void;
  currentUser: User;
}

interface AppointmentsViewProps {
  currentUser: User;
}

// Main App Component
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setCurrentUser(userData);
    localStorage.setItem("currentUser", JSON.stringify(userData));
    setCurrentView("dashboard");
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, { method: "POST" });
      localStorage.removeItem("currentUser");
      setCurrentUser(null);
      setCurrentView("login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!currentUser) {
    return <AuthComponent onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-center h-16 bg-blue-600">
          <Heart className="h-8 w-8 text-white mr-2" />
          <span className="text-white text-xl font-bold">MediCare</span>
        </div>
        <Navigation
          currentView={currentView}
          setCurrentView={setCurrentView}
          userType={currentUser.user_type}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-600 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <Bell className="h-6 w-6 text-gray-500" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 font-medium">
                  {currentUser.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-600"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            <ContentArea currentView={currentView} currentUser={currentUser} />
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Navigation Component
const Navigation: React.FC<NavigationProps> = ({
  currentView,
  setCurrentView,
  userType,
}) => {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      roles: ["admin", "doctor", "patient"],
    },
    { id: "admins", label: "Admins", icon: Shield, roles: ["admin"] },
    {
      id: "doctors",
      label: "Doctors",
      icon: Stethoscope,
      roles: ["admin", "doctor"],
    },
    {
      id: "patients",
      label: "Patients",
      icon: Users,
      roles: ["admin", "doctor"],
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: Calendar,
      roles: ["admin", "doctor", "patient"],
    },
  ];

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(userType)
  );

  return (
    <nav className="mt-8">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-100 transition-colors ${
              currentView === item.id
                ? "bg-blue-50 border-r-4 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
          >
            <Icon className="h-5 w-5 mr-3" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};

// Auth Component (Login/Register)
const AuthComponent: React.FC<AuthComponentProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    role: "patient",
    specialization: "",
    address: "",
    user_type: "patient" as "admin" | "doctor" | "patient",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "/login" : "/register";
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          onLogin(data.user);
        } else {
          setIsLogin(true);
          setError("Registration successful! Please login.");
        }
      } else {
        setError(data.error || "Operation failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <Heart className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">MediCare</h2>
          <p className="text-gray-600 mt-2">Hospital Management System</p>
        </div>

        <div className="flex mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 text-center rounded-l-lg transition-colors ${
              isLogin ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 text-center rounded-r-lg transition-colors ${
              !isLogin ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          )}

          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />

          {!isLogin && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>

              {formData.role === "doctor" && (
                <input
                  type="text"
                  placeholder="Specialization"
                  value={formData.specialization}
                  onChange={(e) =>
                    setFormData({ ...formData, specialization: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              )}

              {formData.role === "patient" && (
                <textarea
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              )}
            </>
          )}

          {isLogin && (
            <select
              value={formData.user_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  user_type: e.target.value as "admin" | "doctor" | "patient",
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Content Area Component
const ContentArea: React.FC<ContentAreaProps> = ({
  currentView,
  currentUser,
}) => {
  switch (currentView) {
    case "dashboard":
      return <Dashboard currentUser={currentUser} />;
    case "admins":
      return <AdminsView />;
    case "doctors":
      return <DoctorsView />;
    case "patients":
      return <PatientsView />;
    case "appointments":
      return <AppointmentsView currentUser={currentUser} />;
    default:
      return <Dashboard currentUser={currentUser} />;
  }
};

// Dashboard Component
const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<DashboardStats>({
    total_patients: 0,
    total_doctors: 0,
    today_appointments: 0,
    total_appointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {currentUser.name}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening at your hospital today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Patients"
          value={stats.total_patients}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Doctors"
          value={stats.total_doctors}
          icon={Stethoscope}
          color="bg-green-500"
        />
        <StatCard
          title="Today's Appointments"
          value={stats.today_appointments}
          icon={Calendar}
          color="bg-yellow-500"
        />
        <StatCard
          title="Total Appointments"
          value={stats.total_appointments}
          icon={Activity}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <QuickActionButton
              icon={UserPlus}
              text="Add New Patient"
              onClick={() => {}}
            />
            <QuickActionButton
              icon={Calendar}
              text="Schedule Appointment"
              onClick={() => {}}
            />
            <QuickActionButton
              icon={Users}
              text="View All Doctors"
              onClick={() => {}}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            <ActivityItem
              text="New patient registered: John Doe"
              time="5 minutes ago"
            />
            <ActivityItem
              text="Appointment scheduled with Dr. Smith"
              time="1 hour ago"
            />
            <ActivityItem text="Patient record updated" time="2 hours ago" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility Components
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={`${color} rounded-lg p-3`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
      </div>
    </div>
  </div>
);

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon: Icon,
  text,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
  >
    <Icon className="h-5 w-5 text-gray-400 mr-3" />
    <span className="text-gray-700">{text}</span>
  </button>
);

const ActivityItem: React.FC<ActivityItemProps> = ({ text, time }) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-gray-700">{text}</span>
    <span className="text-sm text-gray-500">{time}</span>
  </div>
);

// CRUD Views
const AdminsView: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admins`);
      const data = await response.json();
      setAdmins(data.admins);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      try {
        await fetch(`${API_BASE_URL}/admins/${id}`, { method: "DELETE" });
        fetchAdmins();
      } catch (error) {
        console.error("Error deleting admin:", error);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admins Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <DataTable
          data={admins}
          columns={[
            { key: "name", label: "Name" },
            { key: "username", label: "Username" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            {
              key: "created_at",
              label: "Created At",
              render: (value: any) => new Date(value).toLocaleDateString(),
            },
          ]}
          onEdit={(admin: any) => {
            setEditingAdmin(admin);
            setShowModal(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {showModal && (
        <AdminModal
          admin={editingAdmin}
          onClose={() => {
            setShowModal(false);
            setEditingAdmin(null);
          }}
          onSave={() => {
            fetchAdmins();
            setShowModal(false);
            setEditingAdmin(null);
          }}
        />
      )}
    </div>
  );
};

const DoctorsView: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/doctors`);
      const data = await response.json();
      setDoctors(data.doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this doctor?")) {
      try {
        await fetch(`${API_BASE_URL}/doctors/${id}`, { method: "DELETE" });
        fetchDoctors();
      } catch (error) {
        console.error("Error deleting doctor:", error);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Doctors Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Doctor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <DataTable
          data={doctors}
          columns={[
            { key: "name", label: "Name" },
            { key: "username", label: "Username" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "specialization", label: "Specialization" },
            {
              key: "created_at",
              label: "Created At",
              render: (value: any) => new Date(value).toLocaleDateString(),
            },
          ]}
          onEdit={(doctor: any) => {
            setEditingDoctor(doctor);
            setShowModal(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {showModal && (
        <DoctorModal
          doctor={editingDoctor}
          onClose={() => {
            setShowModal(false);
            setEditingDoctor(null);
          }}
          onSave={() => {
            fetchDoctors();
            setShowModal(false);
            setEditingDoctor(null);
          }}
        />
      )}
    </div>
  );
};

const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/patients`);
      const data = await response.json();
      setPatients(data.patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this patient?")) {
      try {
        await fetch(`${API_BASE_URL}/patients/${id}`, { method: "DELETE" });
        fetchPatients();
      } catch (error) {
        console.error("Error deleting patient:", error);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Patients Management
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Patient
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <DataTable
          data={patients}
          columns={[
            { key: "name", label: "Name" },
            { key: "username", label: "Username" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "address", label: "Address" },
            {
              key: "created_at",
              label: "Created At",
              render: (value: any) => new Date(value).toLocaleDateString(),
            },
          ]}
          onEdit={(patient: any) => {
            setEditingPatient(patient);
            setShowModal(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {showModal && (
        <PatientModal
          patient={editingPatient}
          onClose={() => {
            setShowModal(false);
            setEditingPatient(null);
          }}
          onSave={() => {
            fetchPatients();
            setShowModal(false);
            setEditingPatient(null);
          }}
        />
      )}
    </div>
  );
};

// Define the Appointment interface
interface Appointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  specialization: string;
  appointment_date: string;
  appointment_time: string;
  symptoms?: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  created_at: string;
}

const AppointmentsView: React.FC<AppointmentsViewProps> = ({ currentUser }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Appointments data:", data); // Debug log
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // New function to get a specific appointment by ID
  const getAppointment = async (id: string): Promise<Appointment | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch appointment: ${response.statusText}`);
      }
      const data = await response.json();
      return data.appointment;
    } catch (error) {
      console.error("Error fetching appointment:", error);
      return null;
    }
  };

  // Enhanced edit handler that fetches fresh appointment data
  const handleEdit = async (appointment: Appointment) => {
    const freshAppointment = await getAppointment(appointment.id);
    if (freshAppointment) {
      setEditingAppointment(freshAppointment);
      setShowModal(true);
    } else {
      console.error("Failed to fetch appointment details");
      // Fallback to using the existing appointment data
      setEditingAppointment(appointment);
      setShowModal(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(
            `Failed to delete appointment: ${response.statusText}`
          );
        }
        fetchAppointments();
      } catch (error) {
        console.error("Error deleting appointment:", error);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Appointments Management
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Appointment
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <DataTable
          data={appointments}
          columns={[
            { key: "patient_name", label: "Patient" },
            { key: "doctor_name", label: "Doctor" },
            { key: "specialization", label: "Specialization" },
            { key: "symptoms", label: "Symptoms" },
            {
              key: "appointment_date",
              label: "Date",
              render: (value: string) => new Date(value).toLocaleDateString(),
            },
            { key: "appointment_time", label: "Time" },
            {
              key: "status",
              label: "Status",
              render: (value: string) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    value === "Scheduled"
                      ? "bg-yellow-100 text-yellow-800"
                      : value === "Completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: "created_at",
              label: "Created At",
              render: (value: string) => new Date(value).toLocaleDateString(),
            },
          ]}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showModal && (
        <AppointmentModal
          currentUser={currentUser}
          appointment={editingAppointment}
          onClose={() => {
            setShowModal(false);
            setEditingAppointment(null);
          }}
          onSave={() => {
            fetchAppointments();
            setShowModal(false);
            setEditingAppointment(null);
          }}
        />
      )}
    </div>
  );
};

// Data Table Component
const DataTable = ({ data, columns, onEdit, onDelete }: any) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No data available.</div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column: any) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row: any, rowIndex: any) => (
              <tr key={row.id || rowIndex}>
                {columns.map((column: any) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {column.render
                      ? column.render(row[column.key])
                      : row[column.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="h-5 w-5 inline-block" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5 inline-block" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// AdminModal Component
const AdminModal = ({ admin, onClose, onSave }: AdminModalProps) => {
  const [formData, setFormData] = useState({
    name: admin?.name || "",
    username: admin?.username || "",
    email: admin?.email || "",
    phone: admin?.phone || "",
    password: "", // Password will typically be handled separately or not shown for edit
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const method = admin ? "PUT" : "POST";
    const url = admin
      ? `${API_BASE_URL}/admins/${admin.id}`
      : `${API_BASE_URL}/admins`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save admin.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {admin ? "Edit Admin" : "Add Admin"}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {!admin && ( // Only show password field for new admin creation
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// DoctorModal Component (similar structure to AdminModal)
const DoctorModal = ({ doctor, onClose, onSave }: DoctorModalProps) => {
  const [formData, setFormData] = useState({
    name: doctor?.name || "",
    username: doctor?.username || "",
    email: doctor?.email || "",
    phone: doctor?.phone || "",
    specialization: doctor?.specialization || "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const method = doctor ? "PUT" : "POST";
    const url = doctor
      ? `${API_BASE_URL}/doctors/${doctor.id}`
      : `${API_BASE_URL}/doctors`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save doctor.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {doctor ? "Edit Doctor" : "Add Doctor"}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Specialization"
            value={formData.specialization}
            onChange={(e) =>
              setFormData({ ...formData, specialization: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          {!doctor && (
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// PatientModal Component (similar structure)
const PatientModal = ({ patient, onClose, onSave }: PatientModalProps) => {
  const [formData, setFormData] = useState({
    name: patient?.name || "",
    username: patient?.username || "",
    email: patient?.email || "",
    phone: patient?.phone || "",
    address: patient?.address || "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const method = patient ? "PUT" : "POST";
    const url = patient
      ? `${API_BASE_URL}/patients/${patient.id}`
      : `${API_BASE_URL}/patients`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save patient.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {patient ? "Edit Patient" : "Add Patient"}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <textarea
            placeholder="Address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            rows={3}
          ></textarea>
          {!patient && (
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// AppointmentModal Component (more complex as it needs doctors/patients)
const AppointmentModal = ({
  appointment,
  onClose,
  onSave,
  currentUser,
}: AppointmentModalProps) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [formData, setFormData] = useState({
    patient_id: appointment?.patient_id || "", // You'll need to add patient_id to your appointment interface
    doctor_id: appointment?.doctor_id || "", // You'll need to add doctor_id to your appointment interface
    appointment_date: appointment?.appointment_date || "",
    appointment_time: appointment?.appointment_time || "",
    symptoms: appointment?.symptoms || "",
    status: appointment?.status || "Scheduled",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch doctors and patients only if the current user is admin or doctor
    if (
      currentUser.user_type === "admin" ||
      currentUser.user_type === "doctor"
    ) {
      const fetchDependencies = async () => {
        try {
          const [doctorsRes, patientsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/doctors`),
            fetch(`${API_BASE_URL}/patients`),
          ]);
          const doctorsData = await doctorsRes.json();
          const patientsData = await patientsRes.json();
          setDoctors(doctorsData.doctors);
          setPatients(patientsData.patients);
        } catch (err) {
          console.error(
            "Error fetching doctors/patients for appointment modal:",
            err
          );
          setError("Failed to load doctor and patient data.");
        }
      };
      fetchDependencies();
    }
  }, [currentUser.user_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const method = appointment ? "PUT" : "POST";
    const url = appointment
      ? `${API_BASE_URL}/appointments/${appointment.id}`
      : `${API_BASE_URL}/appointments`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save appointment.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {appointment ? "Edit Appointment" : "Schedule Appointment"}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={formData.patient_id}
            onChange={(e) =>
              setFormData({ ...formData, patient_id: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={formData.doctor_id}
            onChange={(e) =>
              setFormData({ ...formData, doctor_id: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Select Doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.specialization})
              </option>
            ))}
          </select>
          <input
            type="date"
            placeholder="Appointment Date"
            value={formData.appointment_date}
            onChange={(e) =>
              setFormData({ ...formData, appointment_date: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="time"
            placeholder="Appointment Time"
            value={formData.appointment_time}
            onChange={(e) =>
              setFormData({ ...formData, appointment_time: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />{" "}
          <input
            placeholder="Symptoms"
            value={formData.symptoms}
            onChange={(e) =>
              setFormData({ ...formData, symptoms: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as
                  | "Scheduled"
                  | "Completed"
                  | "Cancelled",
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
