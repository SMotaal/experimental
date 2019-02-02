# Git

## Extracting Folders

Folders within a repository have a mere symbolic association to the actual folders that reside on disk, which can only be indirectly inferred to exist based on the pathname associated with actual files. So the concept of folders within a repository are nothing more than a simulated effect by the actual git client.

While the client, by design, only operates on files when saving or restoring against a repository, it still packs a lot of powerful features that are designed to work on sets of assets sharing any parent folder.

Below are some ways to leverage these features to extract assets from folders for various purposes.

- [Create a new git repository from a folder in an other repository](https://stackoverflow.com/questions/17413493/create-a-submodule-repository-from-a-folder-and-keep-its-git-commit-history/18129693#18129693)
