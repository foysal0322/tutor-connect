'use client';

import { useState } from 'react';
import AddExpertiseForm from './AddExpertiseForm';
import { deleteTutorExpertise, toggleTutorExpertise } from '../actions';
import { CheckCircle2, CircleDashed } from 'lucide-react';

export default function ExpertiseDashboard({ expertises, allCourses }: { expertises: any[], allCourses: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const editingExpertise = expertises.find(exp => exp.id === editingId);
  const showModal = isAdding || editingId !== null;

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this expertise?')) return;
    setDeletingId(id);
    const res = await deleteTutorExpertise(id);
    if (res?.error) {
      alert(res.error);
    } else {
      if (editingId === id) setEditingId(null);
    }
    setDeletingId(null);
  }

  async function handleToggle(id: string, currentState: boolean) {
    setTogglingId(id);
    const res = await toggleTutorExpertise(id, !currentState);
    if (res?.error) {
      alert(res.error);
    }
    setTogglingId(null);
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl">My Offered Courses</h2>
        <button 
          onClick={() => setIsAdding(true)} 
          className="btn-primary"
        >
          + Add New Expertise
        </button>
      </div>
      
      <div>
        {expertises.length === 0 ? (
          <div className="card text-center p-8 text-muted max-w-4xl">You haven't added any course expertise yet.</div>
        ) : (
          <ul className="flex flex-col gap-4 max-w-4xl list-none">
            {expertises.map(exp => (
              <li key={exp.id} className={`card p-4 transition-all duration-300 border-2 relative ${exp.isActive ? 'border-primary/20 hover:border-primary/40 shadow-sm hover:shadow-md' : 'border-color opacity-70 bg-gray-50/50 hover:opacity-100'}`}>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-3">
                       <h3 className="text-lg font-bold text-main flex items-center gap-2">
                         {exp.course.name}
                         {!exp.isActive && <span className="text-[0.6rem] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold tracking-wider">INACTIVE</span>}
                       </h3>
                       
                       {/* Upper Right Toggle Switch */}
                       <button
                         type="button"
                         role="switch"
                         aria-checked={exp.isActive}
                         onClick={() => handleToggle(exp.id, exp.isActive)}
                         disabled={togglingId === exp.id}
                         className={`relative inline-flex h-6 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${exp.isActive ? 'bg-primary' : 'bg-gray-400 hover:bg-gray-500'}`}
                         aria-label="Toggle expertise"
                       >
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ease-in-out shadow-sm ${exp.isActive ? 'translate-x-7' : 'translate-x-1'}`} />
                       </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/80 p-3 rounded-md border border-color/50">
                      <div>
                        <span className="block text-[0.65rem] uppercase tracking-wider mb-0.5 text-muted">Grade</span>
                        <span className="text-sm font-medium text-main">{exp.courseGrade}</span>
                      </div>
                      <div>
                        <span className="block text-[0.65rem] uppercase tracking-wider mb-0.5 text-muted">Faculty</span>
                        <span className="text-sm font-medium text-main">{exp.facultyName}</span>
                      </div>
                      <div>
                        <span className="block text-[0.65rem] uppercase tracking-wider mb-0.5 text-muted">Availability</span>
                        <span className="text-sm font-medium text-main">{exp.availability}</span>
                      </div>
                      <div>
                        <span className="block text-[0.65rem] uppercase tracking-wider mb-0.5 text-muted">Fee / Session</span>
                        <span className="text-sm font-semibold text-primary">{exp.sessionFee} BDT</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-3 items-center md:items-end w-full md:w-auto justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-color/50">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingId(exp.id)} 
                        className="btn-outline px-3 py-1 text-xs bg-white"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                        className="btn-outline px-3 py-1 text-xs border-danger-hover text-danger-hover hover:bg-danger-hover hover:text-white bg-white"
                      >
                        {deletingId === exp.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl text-main">
                {editingId ? 'Edit Expertise' : 'Add New Expertise'}
              </h2>
              <button 
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="text-muted hover:text-danger-hover transition-colors text-3xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            {editingId && editingExpertise ? (
              <AddExpertiseForm 
                courses={allCourses} 
                initialData={editingExpertise} 
                onSuccess={() => setEditingId(null)}
                onCancel={() => setEditingId(null)} 
              />
            ) : (
              <AddExpertiseForm 
                courses={allCourses} 
                onSuccess={() => setIsAdding(false)}
                onCancel={() => setIsAdding(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
