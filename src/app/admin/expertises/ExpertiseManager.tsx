'use client';

import DataGrid, { ColumnDef } from '@/components/ui/DataGrid';

type ExpertiseRow = {
  id: string;
  tutorName: string;
  tutorNsuId: string;
  courseName: string;
  semesterCompleted: string;
  facultyName: string;
  courseGrade: string;
  availability: string;
  sessionFee: number;
  createdAt: string;
};

export default function ExpertiseManager({ expertises }: { expertises: any[] }) {
  const rows: ExpertiseRow[] = expertises.map((exp) => ({
    id: exp.id,
    tutorName: exp.tutor.name,
    tutorNsuId: exp.tutor.nsuId,
    courseName: exp.course.name,
    semesterCompleted: exp.semesterCompleted,
    facultyName: exp.facultyName,
    courseGrade: exp.courseGrade,
    availability: exp.availability,
    sessionFee: exp.sessionFee,
    createdAt: new Date(exp.createdAt).toLocaleDateString(),
  }));

  const columns: ColumnDef<ExpertiseRow>[] = [
    {
      header: 'Tutor',
      accessorKey: 'tutorName',
      cell: (row) => (
        <div>
          <div className="font-semibold text-main">{row.tutorName}</div>
          <div className="text-xs text-muted">{row.tutorNsuId}</div>
        </div>
      ),
    },
    { header: 'Course', accessorKey: 'courseName' },
    { header: 'Semester', accessorKey: 'semesterCompleted' },
    { header: 'Faculty', accessorKey: 'facultyName' },
    {
      header: 'Grade',
      accessorKey: 'courseGrade',
      cell: (row) => <span className="badge badge-primary">{row.courseGrade}</span>,
    },
    { header: 'Availability', accessorKey: 'availability' },
    {
      header: 'Fee (BDT)',
      accessorKey: 'sessionFee',
      cell: (row) => <span className="font-semibold text-primary">{row.sessionFee}</span>,
    },
    { header: 'Added On', accessorKey: 'createdAt' },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      <DataGrid
        data={rows}
        columns={columns}
        searchKeys={['tutorName', 'courseName', 'facultyName']}
        emptyMessage="No expertises found."
      />
    </div>
  );
}
