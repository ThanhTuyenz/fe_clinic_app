export function packageBookingRoute(pkg: any) {
  const id = String(pkg.id || pkg.packageId || '')
  const requestedBranch = pkg.branchId || pkg.branchBookingMethod?.branchId || ''
  const methods = pkg.bookingMethods || []
  const deployment = methods.find((method: any) => !requestedBranch || method.branchId === requestedBranch)
  const code = pkg.bookingMethodCode || deployment?.code || pkg.bookingMethod?.code || pkg.branchBookingMethod?.bookingMethod?.code
  const branchId = requestedBranch || deployment?.branchId || ''
  const specialtyId = String(pkg.specialtyId || pkg.specialty?.id || '')
  if (code === 'SPECIALTY_EXAM' || code === 'AFTER_HOURS') return {
    pathname: '/booking/specialty' as const,
    params: { serviceId: id, branchId, specialtyId, flow: code === 'AFTER_HOURS' ? 'after-hours' : 'specialty' },
  }
  if (code === 'HEALTH_PACKAGE') return { pathname: '/booking/package' as const, params: { packageId: id, branchId } }
  return { pathname: '/package/[id]' as const, params: { id, branchId } }
}
