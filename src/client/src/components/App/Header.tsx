import { Link } from 'react-router-dom'
import { FiGithub } from 'react-icons/fi'
import { Button } from '../ui/button'
import Logo from './Logo'
import Theme from './Theme'

/**
 * Header
 *
 * @returns header component
 */
const Header = () => {
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b p-3 backdrop-blur">
      <div className="container flex items-center justify-between">
        <div>
          <Logo className="h-8" />
        </div>

        <div className="flex items-center gap-2">
          <Link to="https://github.com/rawand-faraidun/linguify" target="_blank">
            <Button variant="ghost" className="p-2">
              <FiGithub className="h-6 w-6" />
            </Button>
          </Link>
          <Theme />
        </div>
      </div>
    </header>
  )
}

export default Header
