import Logo from './Logo'
import Theme from './Theme'

/**
 * Header
 *
 * @returns header component
 */
const Header = () => {
  return (
    <header className="sticky top-0 p-3 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex justify-between items-center">
        <div>
          <Logo className="h-8" />
        </div>

        <div>
          <Theme />
        </div>
      </div>
    </header>
  )
}

export default Header
