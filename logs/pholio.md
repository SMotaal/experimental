﻿# Pholio

## Extracting Pholio

### 1. Extracting into a new repo

```
# 1. Get a fresh copy of the repository to split

git clone https://github.com/SMotaal/experimental.git pholio
cd pholio

# 2. Remove the current remote
git remote rm origin

# 3. Extract history of the desired folder and commit
git filter-branch --subdirectory-filter pholio -- --all

# 4. Create your online repository
git remote add origin https://github.com/SMotaal/pholio.git

# 5. Push your new repository
#    May need to set upstream first: git push --set-upstream origin master
git push -u origin master
```

By simply enabling github pages on the new repo, it was possible to actually visit [smotaal.github.io/pholio](https://smotaal.github.io/pholio) to see that it worked.

**Note**: At this point the only external dependency that was needed was [smotaal.github.io/markup](https://smotaal.github.io/markup).

### 2. Cleaning up the experimental repo

```
# Clone
cd ~/Projects/@smotaal
git clone https://github.com/SMotaal/experimental.git experimental-2
code experimental-2

# Clean
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch pholio -r' --prune-empty --tag-name-filter cat -- --all

# Push
git push origin master --force
```

### 3. Add submodule

```
# Clone
cd ~/Projects/@smotaal
git clone https://github.com/SMotaal/experimental.git experimental-3
code experimental-3

# Submodule
git submodule add https://github.com/SMotaal/pholio.git
git submodule update
git commit

#Push
git push origin master
```

**References**

- [Create a new git repository from a folder in an other repository](https://stackoverflow.com/questions/17413493/create-a-submodule-repository-from-a-folder-and-keep-its-git-commit-history/18129693#18129693)