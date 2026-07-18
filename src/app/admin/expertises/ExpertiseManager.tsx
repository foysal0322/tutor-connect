'use client';

import { useState, useMemo } from 'react';
import FloatingInput from '@/components/ui/FloatingInput';

export default function ExpertiseManager({ expertises }: { expertises: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExpertises = useMemo(() => {
    if (!searchQuery.trim()) return expertises;
    const lowerQuery = searchQuery.toLowerCase();
    
    return expertises.filter(exp => {
      return (
        exp.tutor.name.toLowerCase().includes(lowerQuery) ||
        exp.course.name.toLowerCase().includes(lowerQuery) ||
        exp.facultyName.toLowerCase().includes(lowerQuery)
      );
    });
  }, [expertises, searchQuery]);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-color bg-gray-50/50 gap-4">
        <div className="w-full sm:w-96">
          <FloatingInput 
            name="search"
            type="text" 
            label="Search by course, tutor, or faculty..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-muted text-sm font-medium">
          Total: {filteredExpertises.length} entries
        </div>
      </div>

      <div className="data-grid-container">
        <table className="data-grid hidden.md:table">
          <thead>
            <tr>
              <th>Tutor Name</th>
              <th>Course</th>
              <th>Semester</th>
              <th>Faculty</th>
              <th>Grade</th>
              <th>Availability</th>
              <th>Fee (BDT)</th>
              <th>Added On</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpertises.map(exp => (
              <tr key={exp.id}>
                <td>
                  <div className="font-semibold text-main">{exp.tutor.name}</div>
                  <div className="text-xs text-muted">{exp.tutor.nsuId}</div>
                </td>
                <td className="font-medium text-main">{exp.course.name}</td>
                <td>{exp.semesterCompleted}</td>
                <td>{exp.facultyName}</td>
                <td>
                  <span className="badge badge-primary">
                    {exp.courseGrade}
                  </span>
                </td>
                <td>{exp.availability}</td>
                <td className="font-semibold text-primary">{exp.sessionFee}</td>
                <td>{new Date(exp.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50">
          {filteredExpertises.map(exp => (
            <div key={exp.id} className="card p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start border-b border-color pb-3">
                <div>
                  <div className="font-semibold text-main text-lg">{exp.course.name}</div>
                  <div className="text-sm text-muted">{exp.tutor.name} ({exp.tutor.nsuId})</div>
                </div>
                <span className="badge badge-primary">
                  {exp.courseGrade}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Semester</div>
                  <div className="font-medium text-main">{exp.semesterCompleted}</div>
                </div>
                <div>
                  <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Faculty</div>
                  <div className="font-medium text-main">{exp.facultyName}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-2 rounded">
                <div>
                  <div className="text-muted text-xs">Fee</div>
                  <div className="font-bold text-primary">{exp.sessionFee} BDT</div>
                </div>
                <div>
                  <div className="text-muted text-xs">Added</div>
                  <div className="font-medium">{new Date(exp.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="text-sm">
                <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Availability</div>
                <div className="font-medium text-main">{exp.availability}</div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredExpertises.length === 0 && (
          <div className="p-8 text-center text-muted">No expertises found.</div>
        )}
      </div>
    </div>
  );
}
