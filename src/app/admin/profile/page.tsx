import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDepartments } from "@/lib/cache";
import ProfileForm from "@/components/ProfileForm";
import { redirect } from "next/navigation";

export default async function AdminProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/admin-signin");
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    redirect("/auth/force-signout?reason=session-expired");
  }

  const departments = await getDepartments();

  return (
    <div className='max-w-2xl'>
      <h1 className='mb-6'>My Profile</h1>
      <ProfileForm user={user} departments={departments} hidePassword />
    </div>
  );
}
