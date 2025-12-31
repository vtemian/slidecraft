import type { ShipColor } from '@slidecraft/shared';

// Verify shared types are accessible
const testColor: ShipColor = 'red';

export default function App() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>SlideCraft</h1>
      <p>Daily Sliding Puzzle</p>
      <p style={{ marginTop: '1rem', opacity: 0.7 }}>
        Rescue ship color: {testColor}
      </p>
    </div>
  );
}
