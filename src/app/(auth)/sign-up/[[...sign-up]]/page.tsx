import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg",
          headerTitle: "text-2xl font-bold",
          headerSubtitle: "text-gray-600",
          socialButtonsBlockButton:
            "border border-gray-300 hover:bg-gray-50",
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 text-white",
          footerActionLink: "text-blue-600 hover:text-blue-700",
        },
      }}
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      forceRedirectUrl="/feed"
    />
  );
}