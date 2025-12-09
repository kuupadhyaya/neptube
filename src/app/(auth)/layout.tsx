import Link from "next/link";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">NewTube</span>
        </Link>
      </div>
      {children}
      <p className="mt-8 text-sm text-gray-500">
        By signing in, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
};

export default Layout;