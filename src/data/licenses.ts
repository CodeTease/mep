import { License } from '../types';

export const POPULAR_LICENSES: License[] = [
    {
        id: 'MIT',
        name: 'MIT License',
        description: 'A short and simple permissive license with conditions only requiring preservation of copyright and license notices. Licensed works, modifications, and larger works may be distributed under different terms and without source code.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        conditions: ['License and copyright notice'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'Apache-2.0',
        name: 'Apache License 2.0',
        description: 'A permissive license whose main conditions require preservation of copyright and license notices. Contributors provide an express grant of patent rights. Licensed works, modifications, and larger works may be distributed under different terms.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        conditions: ['License and copyright notice', 'State changes'],
        limitations: ['Liability', 'Warranty', 'Trademark use']
    },
    {
        id: 'GPL-3.0',
        name: 'GNU General Public License v3.0',
        description: 'Permissions of this strong copyleft license are conditioned on making available complete source code of licensed works and modifications, which include larger works using a licensed work, under the same license. Copyright and license notices must be preserved.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        conditions: ['Disclose source', 'License and copyright notice', 'Same license', 'State changes'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'BSD-3-Clause',
        name: 'BSD 3-Clause "New" or "Revised" License',
        description: 'A permissive license similar to the BSD 2-Clause License, but with a 3rd clause that prohibits others from using the name of the project or its contributors to promote derived products without written consent.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        conditions: ['License and copyright notice'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'ISC',
        name: 'ISC License',
        description: 'A permissive license that is functionally equivalent to the BSD 2-Clause and MIT licenses, but removing some language that is no longer necessary.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        conditions: ['License and copyright notice'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'Unlicense',
        name: 'The Unlicense',
        description: 'A license with no conditions whatsoever which dedicates works to the public domain. Unlicensed works, modifications, and larger works may be distributed under different terms and without source code.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        conditions: [],
        limitations: ['Liability', 'Warranty']
    }
];
