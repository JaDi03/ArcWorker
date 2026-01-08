import { NextResponse } from 'next/server';
import { createCircleTransfer, getCircleWallet, createCircleSession } from '@/arcworker-sdk/wallet/server';
import { createSocialPayment } from '@/utils/db';

export async function POST(request: Request) {
    try {
        const { userToken: providedUserToken, toAddress, amount, token, memo } = await request.json();

        if (!toAddress || !amount) {
            return NextResponse.json({ error: 'Missing destination or amount' }, { status: 400 });
        }

        const userToken = providedUserToken;
        if (!userToken) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get Wallet (to get ID)
        const wallet = await getCircleWallet(providedUserToken);
        if (!wallet) {
            console.error('[Circle Transfer] No wallet found for userToken');
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        console.log(`[Circle Transfer] Using wallet: ${wallet.id} (${wallet.address}) on ${wallet.blockchain}`);

        // 3. Resolve Token ID (Mandatory for Circle Transfer API)
        const { getCircleBalances } = require('@/arcworker-sdk/wallet/server');
        const balances = await getCircleBalances(providedUserToken, wallet.id);

        if (!balances || balances.length === 0) {
            return NextResponse.json({ error: 'No tokens found in wallet' }, { status: 400 });
        }

        let tokenId = undefined;
        const requestedSymbol = token || 'ETH'; // Default to Native

        // Try to find matching token
        const matchedBalance = balances.find((b: any) =>
            b.token.symbol.toUpperCase() === requestedSymbol.toUpperCase()
        );

        if (matchedBalance) {
            tokenId = matchedBalance.token.id;
        } else {
            // Fallback to first available token if requested not found
            console.warn(`[Circle Transfer] Requested token ${requestedSymbol} not found, falling back to ${balances[0].token.symbol}`);
            tokenId = balances[0].token.id;
        }

        console.log(`[Circle Transfer] Final params: Amount=${amount}, TokenId=${tokenId}, Symbol=${requestedSymbol}`);

        const challengeId = await createCircleTransfer(
            providedUserToken,
            wallet.id,
            toAddress,
            amount,
            tokenId
        );

        // Store Memo if provided
        if (memo && challengeId) {
            await createSocialPayment({
                txHash: challengeId, // We use challengeId as a temporary ref until we get txHash, or just keep it
                fromAddress: wallet.address,
                toAddress: toAddress,
                amount: amount,
                symbol: requestedSymbol,
                memo: memo
            });
        }

        return NextResponse.json({ challengeId });

    } catch (error: any) {
        const errorData = error.response?.data || { message: error.message };
        console.error('Circle Transfer Endpoint Error:', errorData);
        return NextResponse.json({
            error: 'Failed to initiate transfer',
            details: errorData
        }, { status: 500 });
    }
}
