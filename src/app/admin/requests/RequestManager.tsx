'use client';

import { useState, useMemo } from 'react';
import styles from '../../dashboard.module.css';
import AssignTutorForm from './AssignTutorForm';

export default function RequestManager({ initialRequests, tutors }: { initialRequests: any[], tutors: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredRequests = useMemo(() => {
    let result = initialRequests;

    if (statusFilter) {
      result = result.filter(req => req.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(req => 
        req.course.name.toLowerCase().includes(lowerQuery) ||
        req.student.name.toLowerCase().includes(lowerQuery) ||
        req.topic?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort: PENDING on top, then by date descending
    result.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [initialRequests, searchQuery, statusFilter]);

  return (
    <div className={styles.card}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
        <input 
          type="text" 
          placeholder="Search by course, student, or topic..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', flex: 1 }}
        />
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="MATCHED">Matched</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Topic</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Assigned Tutor</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(req => (
                <tr key={req.id}>
                  <td>
                    <strong>{req.student.name}</strong><br/>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.student.nsuId}</span>
                  </td>
                  <td>{req.course.name}</td>
                  <td>{req.topic}</td>
                  <td>{req.budget} BDT</td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      backgroundColor: req.status === 'PENDING' ? '#fef3c7' : (req.status === 'CANCELLED' ? '#f1f5f9' : '#d1fae5'),
                      color: req.status === 'PENDING' ? '#d97706' : (req.status === 'CANCELLED' ? '#64748b' : '#047857')
                    }}>
                      {req.status}
                    </span>
                  </td>
                  <td>{req.assignedTutor ? req.assignedTutor.name : 'None'}</td>
                  <td>
                    {req.status === 'PENDING' ? (
                      <AssignTutorForm requestId={req.id} courseId={req.courseId} tutors={tutors} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Assigned</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No requests found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
