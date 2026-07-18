import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DeleteUserButton from './DeleteUserButton';

export default async function AdminUsersPage() {
  // Select only columns rendered in the table — never fetch password hashes
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['STUDENT', 'TUTOR'] }
    },
    select: {
      id: true,
      name: true,
      email: true,
      nsuId: true,
      role: true,
      contact: true,
      isBlocked: true,
      createdAt: true,
      department: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-full">
      <h1 className="mb-6">User Management</h1>
      
      <div className="card p-0 overflow-hidden">
        <div className="data-grid-container">
          <table className="data-grid hidden.md:table">
            <thead>
              <tr>
                <th>Name</th>
                <th>NSU ID</th>
                <th>Role</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="font-semibold text-main">{user.name}</div>
                    <div className="text-xs text-muted">{user.email}</div>
                  </td>
                  <td>{user.nsuId}</td>
                  <td>
                    <span className={`badge ${user.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.department?.name || <span className="text-muted italic">N/A</span>}</td>
                  <td>{user.contact}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <Link 
                        href={`/admin/users/${user.id}`} 
                        className="btn bg-primary text-white hover:bg-primary-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                      >
                        Edit
                      </Link>

                      <form action={async () => {
                        'use server';
                        const { toggleBlockUser } = await import('@/app/actions/admin');
                        await toggleBlockUser(user.id, !user.isBlocked);
                      }}>
                        <button 
                          type="submit" 
                          className={`btn px-3 py-1.5 text-xs font-semibold rounded-md transition-colors text-white ${user.isBlocked ? 'bg-success hover:bg-success-hover' : 'bg-warning hover:bg-warning-hover'}`}
                        >
                          {user.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </form>

                      <DeleteUserButton userId={user.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Mobile View */}
          <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50">
            {users.map(user => (
              <div key={user.id} className="card p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-color pb-3">
                  <div>
                    <div className="font-semibold text-main text-lg">{user.name}</div>
                    <div className="text-sm text-muted">{user.email}</div>
                  </div>
                  <span className={`badge ${user.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}>
                    {user.role}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">NSU ID</div>
                    <div className="font-medium text-main">{user.nsuId}</div>
                  </div>
                  <div>
                    <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Joined</div>
                    <div className="font-medium text-main">{new Date(user.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-2 rounded">
                  <div>
                    <div className="text-muted text-xs">Department</div>
                    <div className="font-medium">{user.department?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted text-xs">Contact</div>
                    <div className="font-medium">{user.contact || 'N/A'}</div>
                  </div>
                </div>
                
                <div className="mt-2 pt-3 border-t border-color flex gap-2 flex-wrap">
                  <Link 
                    href={`/admin/users/${user.id}`} 
                    className="btn bg-primary text-white hover:bg-primary-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-1 text-center"
                  >
                    Edit
                  </Link>

                  <form className="flex-1" action={async () => {
                    'use server';
                    const { toggleBlockUser } = await import('@/app/actions/admin');
                    await toggleBlockUser(user.id, !user.isBlocked);
                  }}>
                    <button 
                      type="submit" 
                      className={`btn w-full px-3 py-1.5 text-xs font-semibold rounded-md transition-colors text-white ${user.isBlocked ? 'bg-success hover:bg-success-hover' : 'bg-warning hover:bg-warning-hover'}`}
                    >
                      {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </form>

                  <div className="w-full">
                    <DeleteUserButton userId={user.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {users.length === 0 && (
          <div className="p-8 text-center text-muted">No users found.</div>
        )}
      </div>
    </div>
  );
}
