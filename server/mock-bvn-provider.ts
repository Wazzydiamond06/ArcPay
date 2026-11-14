/**
 * Mock of a third-party BVN verification provider (the kind that checks a BVN against the bank
 * registry and returns the name on file). No external call is made.
 * Replace `verifyBvn` with the provider's SDK or HTTP call when you have a contract.
 */
export type BvnCheck = { verified: true } | { verified: false; reason: 'bvn_unverified' }

export async function verifyBvn(bvn: string): Promise<BvnCheck> {
  await new Promise((resolve) => setTimeout(resolve, 400)) // provider latency

  // The mock "registry" rejects obviously fake numbers: one repeated digit or a straight run.
  const repeated = /^(\d)\1{10}$/.test(bvn)
  const run = '01234567890123456789'.includes(bvn) || '98765432109876543210'.includes(bvn)
  return repeated || run ? { verified: false, reason: 'bvn_unverified' } : { verified: true }
}
