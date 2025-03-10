import { useContext } from 'react'
import { LuMoonStar, LuSun } from 'react-icons/lu'
import { AppContext } from '../context/AppContext'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Theme as ThemeColor } from '@lib/types/Theme'

const Theme = () => {
  const { theme, setTheme, currentTheme } = useContext(AppContext)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-2">
          {currentTheme == 'light' ? <LuSun className="h-6 w-6" /> : <LuMoonStar className="h-6 w-6" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-high" align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={v => setTheme(v as ThemeColor)}>
          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default Theme
