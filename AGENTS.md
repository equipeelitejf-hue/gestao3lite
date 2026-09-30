<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project architecture

- The dashboard renders by signed-in member (no profile switcher); the first account to sign up becomes the root leader via `claim_membership` RPC.
- Use uploaded brand assets through Lovable Assets pointers; the favicon is the only brand file kept directly in `public/`.
- Network data comes from Cloud tables (members, entries, personal_goals, team_goals) with subtree RLS; tree sums are computed client-side in `src/lib/network.ts` `Network` class to keep queries simple.
