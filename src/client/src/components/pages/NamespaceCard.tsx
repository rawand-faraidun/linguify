import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppContext } from '../context/AppContext'

/**
 * component props
 */
interface Props {
  ns: string
}

/**
 * Namespace card
 *
 * @param props - component props
 *
 * @returns namespace card component
 */
const NamespaceCard = ({ ns }: Props) => {
  const { config } = useContext(AppContext)

  return (
    <Link to={`/${ns}`}>
      <Card key={ns}>
        <CardHeader>
          <CardTitle>{ns.replace('.json', '')}</CardTitle>
          <CardDescription>
            {config?.localesPath}/{'{locale}'}/{ns}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}

export default NamespaceCard
