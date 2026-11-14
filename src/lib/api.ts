/** Name enquiry: lookup recipient using Supabase directly */
export async function lookupRecipient(national: string): Promise<Recipient> {
  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name, arc_wallet_address')
    .eq('phone_number', national)
    .single()

  if (error || !data) {
    throw new NotRegisteredError('Phone number not registered yet. Please check the number.')
  }

  // Inject a valid dummy EVM address so the sender UI allows the transaction
  const mockWallet = data.arc_wallet_address && isAddress(data.arc_wallet_address) 
    ? data.arc_wallet_address 
    : '0x1234567890123456789012345678901234567890'

  return { 
    address: mockWallet as Address, 
    firstName: data.first_name.trim(), 
    lastName: data.last_name.trim() 
  }
}

export async function resolveBank(national: string, bankCode: string, accountNumber: string): Promise<{ accountName: string }> {
  // Add a 1-second fake delay so the UI's loading animation works correctly
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (accountNumber.length < 10) {
    throw new ApiError('server', 'Account number must be 10 digits.');
  }
  return { accountName: "Verified Hackathon Account" };
}

export async function withdrawUsdc(
  national: string,
  amount: string,
  bankCode: string,
  accountNumber: string,
): Promise<WithdrawResult> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      receiver_phone: national,
      amount: amount,
      type: 'withdrawal',
      message: `Withdrawal to ${bankCode} / ${accountNumber}`,
      sender_wallet: '0x0000000000000000000000000000000000000000' // Prevent null database crashes
    }])
    .select()
    .single()

  if (error || !data) {
    console.error(error);
    throw new ApiError('server', 'The withdrawal could not be saved to the database.');
  }

  return {
    withdrawnUsdc: amount,
    transaction: {
      id: data.id,
      type: 'withdrawal',
      amount: String(data.amount),
      message: data.message,
      createdAt: data.created_at
    }
  }
}

