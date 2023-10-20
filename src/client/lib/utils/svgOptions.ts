import { SVGAttributes } from 'react'

/**
 * svg options
 */
type SvgOptions = {
  svg: SVGAttributes<SVGSVGElement>
  path: SVGAttributes<SVGPathElement>
}

/**
 * svg default options
 */
export const svgOptions: SvgOptions = {
  svg: {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    stroke: 'currentColor',
    className: 'w-6 h-6'
  },
  path: {
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }
}
