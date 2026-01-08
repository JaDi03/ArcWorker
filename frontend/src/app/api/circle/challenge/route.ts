import { NextResponse } from 'next/server';
import { getChallengeStatus, getTransactionStatus, getCircleUserTransactions } from '@/arcworker-sdk/wallet/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get('id');
    const userToken = request.headers.get('X-User-Token');

    if (!challengeId || !userToken) {
        return NextResponse.json({ error: 'Missing challengeId or userToken' }, { status: 400 });
    }

    try {
        const status = await getChallengeStatus(userToken, challengeId);
        console.log(`[Circle API] FULL Challenge Status (${challengeId}):`, JSON.stringify(status, null, 2));

        const challengeStatus = status.status || status.challenge?.status;
        const hasTx = status.transaction || status.result?.txHash;
        const transactionId = status.challenge?.transactionId || status.transactionId || status.result?.transactionId;

        if (challengeStatus === 'COMPLETE' && !hasTx) {
            if (transactionId) {
                console.log(`[Circle API] Challenge COMPLETE but TX missing. Fetching Transaction ${transactionId}...`);
                try {
                    const txData = await getTransactionStatus(userToken, transactionId);
                    return NextResponse.json({ status: { ...status, transaction: txData } });
                } catch (txError) {
                    console.warn(`[Circle API] Failed to fetch deep transaction details:`, txError);
                }
            } else {
                // Fallback: Forensic Search (List latest transactions)
                console.log(`[Circle API] Challenge COMPLETE, TX missing, AND no Transaction ID. Performing Forensic Search...`);
                try {
                    const recentTxs = await getCircleUserTransactions(userToken);
                    console.log(`[Circle API] Forensic Search returned ${recentTxs?.length || 0} recent transactions.`);

                    // Find the most recent transaction created within the last 5 minutes (be more generous)
                    const now = new Date().getTime();
                    const latestTx = recentTxs?.find((tx: any) => {
                        const txTime = new Date(tx.createDate).getTime();
                        return (now - txTime) < 300000; // < 5 mins old
                    });

                    if (latestTx) {
                        console.log(`[Circle API] FORENSIC MATCH FOUND: Linked to Transaction ${latestTx.id} (${latestTx.txHash || 'Pending'})`);
                        return NextResponse.json({ status: { ...status, transaction: latestTx } });
                    } else {
                        console.warn(`[Circle API] Forensic Search yielded no match.`);
                    }
                } catch (searchError) {
                    console.warn(`[Circle API] Forensic Search Failed:`, searchError);
                }
            }
        }

        return NextResponse.json({ status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
