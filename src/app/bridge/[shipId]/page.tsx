import CaptainDashboard from '../../../features/fleet-map/CaptainDashboard';

export default async function BridgePage({ params }: { params: Promise<{ shipId: string }> }) {
  const { shipId } = await params;
  
  // Pass the shipId down to the client component
  return (
    <main className="min-h-screen">
      <CaptainDashboard shipId={shipId} />
    </main>
  );
}
