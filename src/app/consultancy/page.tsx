import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default function ConsultancyPage() {
  async function submitConsultancy(formData: FormData) {
    'use server';
    
    // For MVP, we will lookup the user by their NSU ID
    const nsuId = formData.get('nsuId') as string;
    const topic = formData.get('topic') as string;
    const details = formData.get('details') as string;

    const student = await prisma.user.findUnique({
      where: { nsuId }
    });

    if (!student) {
      // In a real app, we'd handle errors better, but for MVP:
      throw new Error("Student with this NSU ID not found. Please register first.");
    }

    await prisma.consultancyRequest.create({
      data: {
        studentId: student.id,
        topic,
        details,
      }
    });

    try {
      const { notifyConsultancyRequest } = await import('@/lib/discord');
      await notifyConsultancyRequest({
        studentName: student.name,
        topic,
      });
    } catch (err) {
      console.error('Failed to send consultancy discord notification', err);
    }

    redirect('/consultancy?success=true');
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '600px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center' }}>Get Free Consultancy</h1>
      
      <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Need advice on course selection, semester planning, or career guidance? Request a free consultation session with a senior mentor.
        </p>

        <form action={submitConsultancy} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Your NSU ID</label>
            <input name="nsuId" type="text" required placeholder="e.g. 2211458642" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Topic</label>
            <select name="topic" required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white' }}>
              <option value="">Select a topic</option>
              <option value="Course Selection Advice">Course Selection Advice</option>
              <option value="Semester Planning">Semester Planning</option>
              <option value="Internship Guidance">Internship Guidance</option>
              <option value="Career Advice">Career Advice</option>
              <option value="Study Strategy">Study Strategy</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Additional Details</label>
            <textarea name="details" required rows={4} placeholder="Briefly describe what you need help with..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}></textarea>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Submit Request</button>
        </form>
      </div>
    </div>
  );
}
