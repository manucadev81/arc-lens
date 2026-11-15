## Summary

Describe what changes and why, and reference the issue with `Closes #N` or `Refs #N`.

## Dataset review

Complete this section when the pull request changes anything under `data/`.

- [ ] `pnpm validate:data` passes.
- [ ] I read every new or changed `name`, `aliases` and `description` and found no person's name, team member, contact detail or social profile. Pattern checks catch emails, handles and phone numbers, but not names.
- [ ] Every new record keeps its source URL, data date, event or cohort, and the winner flag (`unknown` when the source does not say) or grant date.
- [ ] Descriptions are paraphrased, not copied from the source.
