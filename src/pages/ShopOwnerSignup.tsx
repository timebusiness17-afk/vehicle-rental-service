import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone, Store, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const ShopOwnerSignup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    shopName: "",
    shopAddress: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.shopName || !formData.shopAddress || !formData.password) {
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
    const result = await signup(formData.email, formData.password, formData.name, formData.phone, 'owner');
    setIsLoading(false);

    if (result.success) {
      if (result.error) {
        // This is the "check your email" message
        toast.info(result.error);
        navigate('/login');
      } else {
        toast.success("Partner account created! Please verify your email.");
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500 shadow-button">
              <Store className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Partner Registration</h1>
            <p className="mt-2 text-muted-foreground">
              Register your rental shop
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Owner Name *"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-purple-500"
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
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-purple-500"
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
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-purple-500"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <Store className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Shop/Business Name *"
                value={formData.shopName}
                onChange={(e) => handleInputChange("shopName", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-purple-500"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Shop Address *"
                value={formData.shopAddress}
                onChange={(e) => handleInputChange("shopAddress", e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-purple-500"
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
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 pr-12 text-base transition-all focus:border-purple-500"
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
                className="h-14 rounded-2xl border-2 border-border bg-card pl-12 text-base transition-all focus:border-purple-500"
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-purple-500 hover:bg-purple-600" 
              size="lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  Register as Partner
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-purple-500 hover:underline">
              Sign in
            </Link>
          </p>

          {/* Customer signup link */}
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Looking to rent vehicles?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Sign up as customer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
