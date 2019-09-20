#!/usr/bin/env bash
set -e

package_name=$(cat package.json | jq -r '.name')
package_version=$(cat package.json | jq -r '.version')
remote_version=$(npm view "$package_name" --json | jq -r '."dist-tags".latest')

if [ "$package_version" = "$remote_version" ] ; then
  exit 0
fi

echo "Will publish ${package_name}@${package_version}..."

# need environmental variable NPM_TOKEN
npm publish
