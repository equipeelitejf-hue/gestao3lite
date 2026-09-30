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

- Keep the first-stage leader and disciple demo in one client dashboard so profile switching remains instant and backend-free.
- Use uploaded brand assets through Lovable Assets pointers; the favicon is the only brand file kept directly in `public/`.
- Network data, goals and entries live in `src/lib/network.ts` (client store persisted to localStorage) so the demo stays backend-free until Cloud is added.
