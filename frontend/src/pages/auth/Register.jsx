// React hooks
import { useState, useEffect } from 'react';

// Routing utilities
import { Link, useNavigate } from 'react-router-dom';

// API service
import api from '../../services/api';

// Icons for UI
import { UserPlus, Mail, Lock, User, ShieldPlus, KeyRound, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';

// Notification system (toast messages)
import { useNotification } from '../../context/NotificationContext';

export default function Register() {

  // Notification handlers
  const { success, error: toastError, info } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    roll_no: '',
    password: ''
  });

  // Password confirmation
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI + error states
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Navigation
  const navigate = useNavigate();

  /**
   * Redirect user if already logged in
   */
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  /**
   * Send OTP to user's email
   */
  const handleSendOTP = async () => {

    // Validation: email required
    if (!formData.email) {
      toastError("Please enter your academic email first.");
      return;
    }

    // Validation: only university email allowed
    if (!formData.email.includes("christuniversity.in")) {
      toastError("Must be a valid @christuniversity.in email address.");
      return;
    }

    setSendingOtp(true);

    try {
      // API call to send OTP
      await api.post('/auth/send-otp', {
        email: formData.email,
        purpose: "register"
      });

      setOtpSent(true);
      info("OTP sent to your email.");

    } catch (err) {
      toastError(err.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  /**
   * Verify OTP entered by user
   */
  const handleVerifyOTP = async () => {

    // OTP must be exactly 6 digits
    if (otpCode.length !== 6) {
      toastError("OTP must be exactly 6 digits.");
      return;
    }

    setVerifyingOtp(true);

    try {
      // API call to verify OTP
      await api.post('/auth/verify-otp', {
        email: formData.email,
        purpose: "register",
        otp: otpCode
      });

      setOtpVerified(true);
      success("OTP Verified! You may now proceed.");

    } catch (err) {
      toastError(err.response?.data?.detail || "Invalid OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  /**
   * Final registration submission
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    // Ensure OTP verification first
    if (!otpVerified) {
      toastError("You must verify your email with an OTP first.");
      return;
    }

    // Password confirmation validation
    if (!confirmPassword) {
      const msg = "Please re-enter your password to confirm.";
      setError(msg);
      toastError(msg);
      return;
    }

    if (formData.password !== confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      toastError(msg);
      return;
    }

    setLoading(true);

    try {
      // API call to register user
      await api.post('/auth/register', formData);

      success("Account established successfully! Please login.");
      
      // Redirect to login page
      navigate('/login');

    } catch (err) {

      // Extract backend validation error
      let msg = "Registration rejected. System mismatch detected.";

      if (err.response?.data?.detail?.[0]?.msg) {
        msg = err.response.data.detail[0].msg;
      } else {
        msg = err.response?.data?.detail || msg;
      }

      setError(msg);
      toastError(msg);

    } finally {
      setLoading(false);
    }
  };

  /**
   * UI Rendering
   */
  return (
    <div>

      {/* Registration Form */}
      <form onSubmit={handleRegister}>

        {/* Full Name Input */}
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({...formData, full_name: e.target.value})}
          placeholder="Full Name"
          required
        />

        {/* Email + Send OTP */}
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="Email"
          required
        />
        <button type="button" onClick={handleSendOTP}>
          Send OTP
        </button>

        {/* OTP Verification */}
        {otpSent && !otpVerified && (
          <>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter OTP"
            />
            <button type="button" onClick={handleVerifyOTP}>
              Verify OTP
            </button>
          </>
        )}

        {/* Roll Number */}
        <input
          type="text"
          value={formData.roll_no}
          onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
          placeholder="Roll Number"
          required
        />

        {/* Password */}
        <input
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="Password"
          required
        />

        {/* Confirm Password */}
        <input
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm Password"
          required
        />

        {/* Submit */}
        <button type="submit" disabled={!otpVerified}>
          Register
        </button>
      </form>

      {/* Redirect to Login */}
      <Link to="/login">Already have an account?</Link>
    </div>
  );
}
