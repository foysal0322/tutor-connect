import { prisma } from '@/lib/prisma';
import styles from '../../dashboard.module.css';
import Link from 'next/link';
import DeleteUserButton from './DeleteUserButton';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['STUDENT', 'TUTOR'] }
    },
    include: { department: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>User Management</h1>
      
      <div className={styles.card}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
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
                  <strong>{user.name}</strong><br/>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</span>
                </td>
                <td>{user.nsuId}</td>
                <td>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: user.role === 'TUTOR' ? '#e0e7ff' : '#f3f4f6',
                    color: user.role === 'TUTOR' ? '#4f46e5' : '#4b5563'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td>{user.department?.name || 'N/A'}</td>
                <td>{user.contact}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Link href={`/admin/users/${user.id}`} style={{ 
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem', 
                      fontSize: '0.85rem',
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: '4px',
                      textDecoration: 'none'
                    }}>Edit</Link>

                    <form action={async () => {
                      'use server';
                      const { toggleBlockUser } = await import('@/app/actions/admin');
                      await toggleBlockUser(user.id, !user.isBlocked);
                    }}>
                      <button type="submit" style={{ 
                        padding: '0.25rem 0.75rem', 
                        fontSize: '0.85rem',
                        background: user.isBlocked ? '#10b981' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}>
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
        </div>
        
        {users.length === 0 && (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</p>
        )}
      </div>
    </div>
  );
}
