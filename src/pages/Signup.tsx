import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const result = await signup(formData.email, formData.password, formData.name, formData.phone, 'user');
    setIsLoading(false);

    if (result.success) {
      if (result.error) {
        // This is the "check your email" message
        toast.info(result.error);
        navigate('/login');
      } else {
        toast.success("Account created successfully!");
        navigate('/login');
      }
    } else {
      toast.error(result.error || "Signup failed");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="gradient-hero flex flex-1 flex-col justify-center px-6 py-8">
        <div className="mx-auto w-full max-w-sm animate-slide-up">
          {/* Logo */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-button">
              <svg
                className="h-8 w-8 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
            <p className="mt-2 text-muted-foreground">
              Sign up as a customer
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Full Name *"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-primary"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address *"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-primary"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-primary"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password *"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 pr-12 text-base transition-all focus:border-primary"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password *"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-primary"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>

          {/* Shop owner signup link */}
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Own a rental shop?{" "}
            <Link to="/shop-signup" className="font-semibold text-purple-500 hover:underline">
              Register as partner
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
