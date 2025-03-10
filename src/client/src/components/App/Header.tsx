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
    <header className="sticky top-0 p-3 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex justify-between items-center">
        <div>
          <Logo className="h-8" />
        </div>

        <div className="flex items-center gap-2">
          <Link to="https://github.com/rawand-faraidun/linguify" target="_blank">
            <Button variant="ghost" className="p-2">
              <FiGithub className="w-6 h-6" />
            </Button>
          </Link>
          <Theme />
        </div>
      </div>
    </header>
  )
}

export default Header
