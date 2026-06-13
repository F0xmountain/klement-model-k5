import VersusClient from '@/components/versus/VersusClient'

// Query-param-modus: /versus?a=Spain&b=Netherlands. VersusClient leest de teams
// uit de URL-query (zonder initialA/initialB).
export default function VersusPage() {
  return <VersusClient />
}
