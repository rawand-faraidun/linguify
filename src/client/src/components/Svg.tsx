import { SVGAttributes } from 'react'
import { svgOptions } from '@lib/utils/svgOptions'

/**
 * component props
 */
interface Props extends SVGAttributes<SVGSVGElement> {
  /**
   * svg paths
   */
  paths: (
    | SVGAttributes<SVGPathElement>['d']
    | { value: SVGAttributes<SVGPathElement>['d']; props?: Omit<SVGAttributes<SVGPathElement>, 'd'> }
  )[]

  /**
   * path props
   */
  pathProps?: Omit<SVGAttributes<SVGPathElement>, 'd'>
}

/**
 * Svg
 *
 * @param props - component props
 *
 * @returns svg component
 */
const Svg = ({ paths, pathProps, ...props }: Props) => (
  <svg {...svgOptions.svg} {...props}>
    {paths.map((p, i) => (
      <path
        key={i}
        {...svgOptions.path}
        {...pathProps}
        {...(typeof p == 'object' ? p.props : {})}
        d={typeof p == 'object' ? p.value : p}
      />
    ))}
  </svg>
)

export default Svg
