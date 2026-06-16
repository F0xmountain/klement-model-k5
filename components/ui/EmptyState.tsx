import Image from 'next/image'

// Lege-state met de vos-in-pak-mascotte. UI-primitive (geen route/pagina), bedoeld
// om een kale "—" te vervangen waar een lijst leeg is. Token-gestyled, dus dark/light.
export default function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', gap: 12, padding: '40px 20px',
    }}>
      <Image
        src="/Suit_fox.png"
        alt="Een vos in pak die schouderophalend afwacht"
        width={110}
        height={110}
        style={{ width: 'auto', maxWidth: '100%', height: 'auto', opacity: 0.9 }}
      />
      <span style={{ fontSize: 10, color: 'var(--color-muted)', letterSpacing: 0.5 }}>{message}</span>
    </div>
  )
}
