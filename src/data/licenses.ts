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
    },
    {
        id: 'BSD-2-Clause',
        name: 'BSD 2-Clause "Simplified" License',
        description: 'A permissive license that is similar to the MIT License, with conditions requiring preservation of copyright and license notices.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        conditions: ['License and copyright notice'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'LGPL-3.0',
        name: 'GNU Lesser General Public License v3.0',
        description: 'A weak copyleft license permitting proprietary use. Requires preservation of copyright and license notices. Modifications of the library under the same license must be provided under the LGPL, but applications built on top may be licensed proprietary.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        conditions: ['Disclose source', 'License and copyright notice', 'Same license', 'State changes'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'AGPL-3.0',
        name: 'GNU Affero General Public License v3.0',
        description: 'A strong copyleft license that requires releasing source code when distributing the software over a network. Includes all conditions of GPL-3.0 plus a network use clause.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        conditions: ['Disclose source', 'License and copyright notice', 'Network use disclosure', 'Same license', 'State changes'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'MPL-2.0',
        name: 'Mozilla Public License 2.0',
        description: 'A copyleft license that is easy to comply with. You must make the source code for any of your modifications available under MPL-2.0, but you can combine the software with code under other licenses.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        conditions: ['Disclose source', 'License and copyright notice', 'Same license'],
        limitations: ['Liability', 'Warranty', 'Trademark use']
    },
    {
        id: 'EPL-2.0',
        name: 'Eclipse Public License 2.0',
        description: 'A copyleft license based on the Mozilla Public License, designed for programs and libraries. Modified code under the same license must be provided.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        conditions: ['Disclose source', 'License and copyright notice', 'Same license'],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'CC0-1.0',
        name: 'Creative Commons Zero v1.0 Universal',
        description: 'A public domain dedication waiver that places works in the public domain. A work released under CC0 incurs no obligations and anyone may use the work in any way.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        conditions: [],
        limitations: ['Liability', 'Warranty']
    },
    {
        id: 'WTFPL',
        name: 'Do What The F* You Want To Public License',
        description: 'An extremely permissive license that allows anyone to do whatever they want with the work with no restrictions whatsoever.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        conditions: [],
        limitations: ['Liability', 'Warranty']
    }
];
