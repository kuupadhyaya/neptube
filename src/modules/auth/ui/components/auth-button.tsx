"use client";

import { Button } from "@/components/ui/button";
import { UserCircleIcon, LogOut, User, Video } from "lucide-react";
import {
  UserButton,
  SignInButton,
  SignedIn,
  SignedOut,
  useClerk,
  useUser,
} from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const AuthButton = () => {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      <SignedIn>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-100 rounded-full px-2 py-1 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                <AvatarFallback>
                  {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
                {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.fullName || user?.firstName || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/studio")}
              className="cursor-pointer"
            >
              <Video className="mr-2 h-4 w-4" />
              Your Studio
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/channel")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Your Channel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SignedIn>

      <SignedOut>
        <SignInButton mode="modal">
          <Button
            variant="outline"
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 border-blue-500/20 rounded-full shadow-none"
          >
            <UserCircleIcon className="mr-1 h-5 w-5" />
            Sign in
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  );
};
