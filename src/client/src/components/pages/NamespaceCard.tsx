import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppContext } from '../context/AppContext'
import NamespaceActions, { Props as ActionProps } from './NamespaceActions'
import { Namespace } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
interface Props extends Omit<ActionProps, 'ns'> {
  ns: Namespace
}

/**
 * Namespace card
 *
 * @param props - component props
 *
 * @returns namespace card component
 */
const NamespaceCard = ({ ns, ...actionProps }: Props) => {
  const namespace = ns.replace('.json', '')
  const { config } = useContext(AppContext)

  return (
    <div className="relative">
      <Link to={`/${ns}`}>
        <Card key={ns} className="relative">
          <CardHeader>
            <CardTitle>{namespace}</CardTitle>
            <CardDescription>
              {config?.localesPath}/{'{locale}'}/{ns}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {/* card actions */}
      <div className="absolute top-0 right-0 z-10">
        <NamespaceActions ns={ns} {...actionProps} />
      </div>
    </div>
  )
}

export default NamespaceCard
