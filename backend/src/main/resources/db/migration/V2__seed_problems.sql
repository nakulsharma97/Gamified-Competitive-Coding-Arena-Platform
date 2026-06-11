START TRANSACTION;

CREATE TEMPORARY TABLE tmp_seed_problem_ids (
    code VARCHAR(4) NOT NULL PRIMARY KEY,
    id CHAR(36) NOT NULL
);

INSERT INTO tmp_seed_problem_ids (code, id) VALUES
    ('P01', UUID()),
    ('P02', UUID()),
    ('P03', UUID()),
    ('P04', UUID()),
    ('P05', UUID()),
    ('P06', UUID()),
    ('P07', UUID()),
    ('P08', UUID()),
    ('P09', UUID()),
    ('P10', UUID()),
    ('P11', UUID()),
    ('P12', UUID()),
    ('P13', UUID()),
    ('P14', UUID()),
    ('P15', UUID()),
    ('P16', UUID()),
    ('P17', UUID()),
    ('P18', UUID()),
    ('P19', UUID()),
    ('P20', UUID());

INSERT INTO problems (id, title, description, difficulty, topics, constraints_text, time_limit_ms, memory_limit_mb, optimal_time_complexity, optimal_space_complexity, battle_use_count)
SELECT ids.id, data.title, data.description, data.difficulty, data.topics, data.constraints_text, 2000, 256, data.optimal_time_complexity, data.optimal_space_complexity, 0
FROM (
    SELECT 'P01' AS code, 'Two Sum' AS title,
        'Given an array of integers and a target value, return the indices of the two numbers that add up to the target. Each input in these seeds has exactly one valid answer, and you may not reuse the same element twice. Return the indices in ascending order.' AS description,
        'EASY' AS difficulty, JSON_ARRAY('Array', 'Hash Table') AS topics,
        'The array contains at least two numbers and exactly one solution exists.' AS constraints_text,
        'O(n)' AS optimal_time_complexity, 'O(n)' AS optimal_space_complexity
    UNION ALL SELECT 'P02', 'Valid Parentheses',
        'Given a string made of bracket characters, determine whether it is balanced. Every opening bracket must be closed by the same type in the correct order, and no closer may appear before its matching opener. An empty string is valid.' ,
        'EASY', JSON_ARRAY('Stack', 'String'),
        'The string contains only parentheses, brackets, and braces.',
        'O(n)', 'O(n)'
    UNION ALL SELECT 'P03', 'Reverse Linked List',
        'Reverse a singly linked list and return the new head. The links must be flipped so the last node becomes the first and the first node becomes the last. Do not create a second list just to hold the answer.' ,
        'EASY', JSON_ARRAY('Linked List', 'Pointer Manipulation'),
        'The list may be empty or contain a single node.',
        'O(n)', 'O(1)'
    UNION ALL SELECT 'P04', 'Binary Search',
        'Search a sorted array for a target value and return its index. If the value is not present, return -1. The seeds use strictly increasing arrays so there is no ambiguity about the result.' ,
        'EASY', JSON_ARRAY('Array', 'Binary Search'),
        'The input array is sorted in ascending order.',
        'O(log n)', 'O(1)'
    UNION ALL SELECT 'P05', 'Palindrome Number',
        'Determine whether an integer reads the same from left to right and right to left. Negative numbers are not palindromes because of the minus sign. Solve it without converting the number to a string if possible.' ,
        'EASY', JSON_ARRAY('Math', 'Two Pointers'),
        'The input is a 32-bit signed integer.',
        'O(log n)', 'O(1)'
    UNION ALL SELECT 'P06', 'Merge Two Sorted Lists',
        'Merge two sorted linked lists into one sorted list. Preserve ascending order and reuse the existing nodes when possible. Either input list may be empty.' ,
        'EASY', JSON_ARRAY('Linked List', 'Two Pointers'),
        'Each list is sorted in nondecreasing order.',
        'O(n)', 'O(1)'
    UNION ALL SELECT 'P07', 'Maximum Subarray',
        'Find the maximum possible sum of any contiguous subarray. The array can contain negative numbers, so the best answer may be a single element rather than a long run. Return only the sum.' ,
        'EASY', JSON_ARRAY('Array', 'Dynamic Programming'),
        'The array has at least one number.',
        'O(n)', 'O(1)'
    UNION ALL SELECT 'P08', 'Climbing Stairs',
        'Count how many distinct ways there are to reach step n when you may climb either 1 or 2 steps at a time. This is the classic Fibonacci transition in disguise. Return the number of ways only.' ,
        'EASY', JSON_ARRAY('Dynamic Programming'),
        '1 <= n <= 45.',
        'O(n)', 'O(1)'
    UNION ALL SELECT 'P09', '3Sum',
        'Return every unique triplet whose values sum to zero. Duplicate triplets must not appear in the answer even when the input contains repeated numbers. The order of triplets is not important as long as each triplet is correct and unique.' ,
        'MEDIUM', JSON_ARRAY('Array', 'Two Pointers'),
        'The input can contain duplicates and negative numbers.',
        'O(n^2)', 'O(1)'
    UNION ALL SELECT 'P10', 'Longest Substring Without Repeating Characters',
        'Find the length of the longest substring that contains no repeated characters. The substring must be contiguous and case-sensitive. Return only the maximum length, not the substring itself.' ,
        'MEDIUM', JSON_ARRAY('String', 'Sliding Window'),
        'The string may be empty.',
        'O(n)', 'O(min(n, k))'
    UNION ALL SELECT 'P11', 'Container With Most Water',
        'Given vertical lines on the x-axis, choose two lines that form a container holding the most water. The width is determined by the distance between indices and the height is limited by the shorter line. Return the maximum area only.' ,
        'MEDIUM', JSON_ARRAY('Array', 'Two Pointers'),
        'At least two heights are provided.',
        'O(n)', 'O(1)'
    UNION ALL SELECT 'P12', 'LRU Cache',
        'Implement an LRU cache that supports get and put. When the cache exceeds its capacity, evict the least recently used entry before inserting the new one. The test inputs provide an operation stream and the expected outputs list the values returned by get calls.' ,
        'MEDIUM', JSON_ARRAY('Design', 'Hash Table', 'Doubly Linked List'),
        'The cache capacity is positive and the operation stream is valid.',
        'O(1)', 'O(capacity)'
    UNION ALL SELECT 'P13', 'Number of Islands',
        'Count how many separate islands appear in a binary grid. Cells connect only in the four cardinal directions, so diagonal touches do not merge islands. Water cells should be ignored.' ,
        'MEDIUM', JSON_ARRAY('DFS', 'BFS', 'Matrix'),
        'The grid contains only 0 and 1 values.',
        'O(mn)', 'O(mn)'
    UNION ALL SELECT 'P14', 'Coin Change',
        'Given coin denominations and a target amount, return the fewest coins needed to make that amount. Unlimited copies of each coin denomination are available, and if the amount cannot be formed you must return -1. The goal is the minimum count, not the combination itself.' ,
        'MEDIUM', JSON_ARRAY('Dynamic Programming', 'Breadth First Search'),
        'Coin values are positive integers.',
        'O(amount * coins)', 'O(amount)'
    UNION ALL SELECT 'P15', 'Word Search',
        'Determine whether a word can be formed by tracing adjacent cells in a board. Each move may go up, down, left, or right, and a cell may be used at most once in the same path. Return true only if the full word can be matched.' ,
        'MEDIUM', JSON_ARRAY('DFS', 'Backtracking', 'Matrix'),
        'The board contains letters only.',
        'O(mn * 4^L)', 'O(L)'
    UNION ALL SELECT 'P16', 'Merge Intervals',
        'Merge all overlapping intervals and return the compacted list. Intervals that touch at endpoints are treated as overlapping for these seeds. The final list should be sorted by start time.' ,
        'MEDIUM', JSON_ARRAY('Array', 'Sorting'),
        'Intervals are given as pairs of integers.',
        'O(n log n)', 'O(n)'
    UNION ALL SELECT 'P17', 'Median of Two Sorted Arrays',
        'Given two sorted arrays, compute the median of their combined values. The solution must handle both odd and even total lengths correctly. Return the median as a decimal when needed.' ,
        'HARD', JSON_ARRAY('Array', 'Binary Search', 'Divide and Conquer'),
        'Both arrays are sorted in nondecreasing order.',
        'O(log(min(m,n)))', 'O(1)'
    UNION ALL SELECT 'P18', 'Trapping Rain Water',
        'Given a row of elevation bars, compute how much rainwater can be trapped after a storm. Water can be held only between taller bars on both sides. Return the total trapped units.' ,
        'HARD', JSON_ARRAY('Array', 'Two Pointers', 'Prefix Sum'),
        'Heights are nonnegative integers.',
        'O(n)', 'O(1)'
    UNION ALL SELECT 'P19', 'Word Ladder',
        'Transform the begin word into the end word by changing one letter at a time. Every intermediate word must appear in the dictionary, and each step must change exactly one character. Return the length of the shortest valid sequence, or 0 if no sequence exists.' ,
        'HARD', JSON_ARRAY('Breadth First Search', 'Hash Table'),
        'All words have the same length.',
        'O(n * m^2)', 'O(n * m)'
    UNION ALL SELECT 'P20', 'Serialize and Deserialize Binary Tree',
        'Encode and decode a binary tree using level-order notation. The serializer must preserve structure with null markers so the exact tree can be reconstructed. These seeds use canonical array form for both the input and the expected round-trip output.' ,
        'HARD', JSON_ARRAY('Tree', 'Design', 'Breadth First Search'),
        'The tree uses null markers in its serialized form.',
        'O(n)', 'O(n)'
) AS data
JOIN tmp_seed_problem_ids AS ids ON ids.code = data.code;

INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden, explanation, display_order)
SELECT UUID(), ids.id, tc.input, tc.expected_output, tc.is_hidden, tc.explanation, tc.display_order
FROM (
    SELECT 'P01' AS code, '{"nums":[2,7,11,15],"target":9}' AS input, '[0,1]' AS expected_output, 0 AS is_hidden, 'classic pair' AS explanation, 1 AS display_order
    UNION ALL SELECT 'P01', '{"nums":[3,2,4],"target":6}', '[1,2]', 0, 'middle pair', 2
    UNION ALL SELECT 'P01', '{"nums":[3,3],"target":6}', '[0,1]', 0, 'duplicate pair', 3
    UNION ALL SELECT 'P01', '{"nums":[1,5,1,5],"target":10}', '[1,3]', 1, 'duplicate values', 4
    UNION ALL SELECT 'P01', '{"nums":[0,4,3,0],"target":0}', '[0,3]', 1, 'zero target', 5
    UNION ALL SELECT 'P01', '{"nums":[1,2,3,4,5],"target":9}', '[3,4]', 1, 'tail pair', 6
    UNION ALL SELECT 'P01', '{"nums":[-1,-2,-3,-4,-5],"target":-8}', '[2,4]', 1, 'negative values', 7
    UNION ALL SELECT 'P01', '{"nums":[10,20,30,40],"target":50}', '[0,3]', 1, 'endpoints', 8

    UNION ALL SELECT 'P02', '"()[]{}"', 'true', 0, 'balanced brackets', 1
    UNION ALL SELECT 'P02', '"(]"', 'false', 0, 'mismatch', 2
    UNION ALL SELECT 'P02', '"([{}])"', 'true', 0, 'nested brackets', 3
    UNION ALL SELECT 'P02', '"((("', 'false', 1, 'unfinished opens', 4
    UNION ALL SELECT 'P02', '"{[]}"', 'true', 1, 'nested simple', 5
    UNION ALL SELECT 'P02', '"([)]"', 'false', 1, 'wrong order', 6
    UNION ALL SELECT 'P02', '""', 'true', 1, 'empty string', 7
    UNION ALL SELECT 'P02', '"{[()()]}"', 'true', 1, 'mixed balanced', 8

    UNION ALL SELECT 'P03', '[1,2,3,4,5]', '[5,4,3,2,1]', 0, 'five nodes', 1
    UNION ALL SELECT 'P03', '[1,2]', '[2,1]', 0, 'two nodes', 2
    UNION ALL SELECT 'P03', '[1]', '[1]', 0, 'single node', 3
    UNION ALL SELECT 'P03', '[0,-1,-2]', '[-2,-1,0]', 1, 'negative values', 4
    UNION ALL SELECT 'P03', '[2,2,2]', '[2,2,2]', 1, 'same values', 5
    UNION ALL SELECT 'P03', '[1,3,5,7]', '[7,5,3,1]', 1, 'odd length', 6
    UNION ALL SELECT 'P03', '[]', '[]', 1, 'empty list', 7
    UNION ALL SELECT 'P03', '[9,8,7,6,5,4]', '[4,5,6,7,8,9]', 1, 'six nodes', 8

    UNION ALL SELECT 'P04', '{"nums":[-1,0,3,5,9,12],"target":9}', '4', 0, 'found', 1
    UNION ALL SELECT 'P04', '{"nums":[-1,0,3,5,9,12],"target":2}', '-1', 0, 'missing', 2
    UNION ALL SELECT 'P04', '{"nums":[1],"target":1}', '0', 0, 'single hit', 3
    UNION ALL SELECT 'P04', '{"nums":[1,2,3,4,5],"target":1}', '0', 1, 'first', 4
    UNION ALL SELECT 'P04', '{"nums":[1,2,3,4,5],"target":5}', '4', 1, 'last', 5
    UNION ALL SELECT 'P04', '{"nums":[1,3,5,7,9],"target":7}', '3', 1, 'odd length', 6
    UNION ALL SELECT 'P04', '{"nums":[2,4,6,8,10],"target":6}', '2', 1, 'even length', 7
    UNION ALL SELECT 'P04', '{"nums":[1,2,4,8,16],"target":8}', '3', 1, 'powers', 8

    UNION ALL SELECT 'P05', '121', 'true', 0, 'positive palindrome', 1
    UNION ALL SELECT 'P05', '-121', 'false', 0, 'negative number', 2
    UNION ALL SELECT 'P05', '10', 'false', 0, 'trailing zero', 3
    UNION ALL SELECT 'P05', '0', 'true', 1, 'zero', 4
    UNION ALL SELECT 'P05', '12321', 'true', 1, 'odd palindrome', 5
    UNION ALL SELECT 'P05', '1234321', 'true', 1, 'long palindrome', 6
    UNION ALL SELECT 'P05', '1221', 'true', 1, 'even palindrome', 7
    UNION ALL SELECT 'P05', '12345', 'false', 1, 'not a palindrome', 8

    UNION ALL SELECT 'P06', '{"list1":[1,2,4],"list2":[1,3,4]}', '[1,1,2,3,4,4]', 0, 'interleaved lists', 1
    UNION ALL SELECT 'P06', '{"list1":[],"list2":[]}', '[]', 0, 'both empty', 2
    UNION ALL SELECT 'P06', '{"list1":[],"list2":[0]}', '[0]', 0, 'single list', 3
    UNION ALL SELECT 'P06', '{"list1":[2,5,7],"list2":[1,3,6,8]}', '[1,2,3,5,6,7,8]', 1, 'different lengths', 4
    UNION ALL SELECT 'P06', '{"list1":[1,2,4],"list2":[2,6]}', '[1,2,2,4,6]', 1, 'shared values', 5
    UNION ALL SELECT 'P06', '{"list1":[-3,-1,2],"list2":[-2,0,3]}', '[-3,-2,-1,0,2,3]', 1, 'negative values', 6
    UNION ALL SELECT 'P06', '{"list1":[5],"list2":[1,2,3,4]}', '[1,2,3,4,5]', 1, 'one-node list', 7
    UNION ALL SELECT 'P06', '{"list1":[1,4,5],"list2":[1,3,4]}', '[1,1,3,4,4,5]', 1, 'overlapping duplicates', 8

    UNION ALL SELECT 'P07', '[-2,1,-3,4,-1,2,1,-5,4]', '6', 0, 'classic Kadane example', 1
    UNION ALL SELECT 'P07', '[1]', '1', 0, 'single element', 2
    UNION ALL SELECT 'P07', '[5,4,-1,7,8]', '23', 0, 'mostly positive', 3
    UNION ALL SELECT 'P07', '[-1,-2,-3]', '-1', 1, 'all negative', 4
    UNION ALL SELECT 'P07', '[0,0,0]', '0', 1, 'all zeros', 5
    UNION ALL SELECT 'P07', '[1,-1,1,-1,1]', '1', 1, 'alternating', 6
    UNION ALL SELECT 'P07', '[2,-1,2,3,4,-5]', '10', 1, 'middle best', 7
    UNION ALL SELECT 'P07', '[8,-19,5,-4,20]', '21', 1, 'tail rebound', 8

    UNION ALL SELECT 'P08', '1', '1', 0, 'one step', 1
    UNION ALL SELECT 'P08', '2', '2', 0, 'two steps', 2
    UNION ALL SELECT 'P08', '3', '3', 0, 'three steps', 3
    UNION ALL SELECT 'P08', '4', '5', 1, 'four steps', 4
    UNION ALL SELECT 'P08', '5', '8', 1, 'five steps', 5
    UNION ALL SELECT 'P08', '6', '13', 1, 'six steps', 6
    UNION ALL SELECT 'P08', '7', '21', 1, 'seven steps', 7
    UNION ALL SELECT 'P08', '10', '89', 1, 'ten steps', 8

    UNION ALL SELECT 'P09', '[-1,0,1,2,-1,-4]', '[[-1,-1,2],[-1,0,1]]', 0, 'reference set', 1
    UNION ALL SELECT 'P09', '[0,1,1]', '[]', 0, 'no triplet', 2
    UNION ALL SELECT 'P09', '[0,0,0]', '[[0,0,0]]', 0, 'all zeros', 3
    UNION ALL SELECT 'P09', '[-2,0,1,1,2]', '[[-2,0,2],[-2,1,1]]', 1, 'two answers', 4
    UNION ALL SELECT 'P09', '[-2,0,0,2,2]', '[[-2,0,2]]', 1, 'dedupe', 5
    UNION ALL SELECT 'P09', '[3,-2,1,0]', '[]', 1, 'no match', 6
    UNION ALL SELECT 'P09', '[-1,0,1,0]', '[[-1,0,1]]', 1, 'duplicate zeros', 7
    UNION ALL SELECT 'P09', '[-2,0,1,1]', '[]', 1, 'insufficient sum', 8

    UNION ALL SELECT 'P10', '"abcabcbb"', '3', 0, 'repeat cycle', 1
    UNION ALL SELECT 'P10', '"bbbbb"', '1', 0, 'all same', 2
    UNION ALL SELECT 'P10', '"pwwkew"', '3', 0, 'middle window', 3
    UNION ALL SELECT 'P10', '"dvdf"', '3', 1, 'overlap reuse', 4
    UNION ALL SELECT 'P10', '""', '0', 1, 'empty string', 5
    UNION ALL SELECT 'P10', '"au"', '2', 1, 'two chars', 6
    UNION ALL SELECT 'P10', '"abba"', '2', 1, 'window shift', 7
    UNION ALL SELECT 'P10', '"tmmzuxt"', '5', 1, 'longer window', 8

    UNION ALL SELECT 'P11', '[1,8,6,2,5,4,8,3,7]', '49', 0, 'classic max area', 1
    UNION ALL SELECT 'P11', '[1,1]', '1', 0, 'two lines', 2
    UNION ALL SELECT 'P11', '[4,3,2,1,4]', '16', 0, 'tall ends', 3
    UNION ALL SELECT 'P11', '[1,2,4,3]', '4', 1, 'small example', 4
    UNION ALL SELECT 'P11', '[1,2,1]', '2', 1, 'center tall line', 5
    UNION ALL SELECT 'P11', '[1,2,3,4,5,6]', '9', 1, 'increasing', 6
    UNION ALL SELECT 'P11', '[6,5,4,3,2,1]', '9', 1, 'decreasing', 7
    UNION ALL SELECT 'P11', '[4,1,1,4]', '12', 1, 'wide ends', 8

    UNION ALL SELECT 'P12', '{"capacity":2,"operations":[{"type":"put","key":1,"value":1},{"type":"put","key":2,"value":2},{"type":"get","key":1},{"type":"put","key":3,"value":3},{"type":"get","key":2},{"type":"put","key":4,"value":4},{"type":"get","key":1},{"type":"get","key":3},{"type":"get","key":4}]}' , '[1,-1,-1,3,4]', 0, 'standard eviction flow', 1
    UNION ALL SELECT 'P12', '{"capacity":1,"operations":[{"type":"put","key":1,"value":1},{"type":"get","key":1},{"type":"put","key":2,"value":2},{"type":"get","key":1},{"type":"get","key":2}]}' , '[1,-1,2]', 0, 'single slot', 2
    UNION ALL SELECT 'P12', '{"capacity":2,"operations":[{"type":"put","key":2,"value":2},{"type":"put","key":1,"value":1},{"type":"get","key":2},{"type":"put","key":3,"value":3},{"type":"get","key":1},{"type":"get","key":2}]}' , '[2,-1,2]', 0, 'recent access', 3
    UNION ALL SELECT 'P12', '{"capacity":3,"operations":[{"type":"put","key":1,"value":1},{"type":"put","key":2,"value":2},{"type":"put","key":3,"value":3},{"type":"get","key":2},{"type":"put","key":4,"value":4},{"type":"get","key":1},{"type":"get","key":3},{"type":"get","key":4}]}' , '[2,-1,3,4]', 1, 'three entry cache', 4
    UNION ALL SELECT 'P12', '{"capacity":2,"operations":[{"type":"put","key":1,"value":1},{"type":"put","key":2,"value":2},{"type":"put","key":1,"value":10},{"type":"get","key":1},{"type":"put","key":3,"value":3},{"type":"get","key":2},{"type":"get","key":3}]}' , '[10,-1,3]', 1, 'update existing key', 5
    UNION ALL SELECT 'P12', '{"capacity":3,"operations":[{"type":"put","key":1,"value":1},{"type":"put","key":2,"value":2},{"type":"put","key":3,"value":3},{"type":"get","key":1},{"type":"put","key":4,"value":4},{"type":"get","key":2},{"type":"get","key":3},{"type":"get","key":4}]}' , '[1,-1,3,4]', 1, 'older eviction', 6
    UNION ALL SELECT 'P12', '{"capacity":2,"operations":[{"type":"put","key":1,"value":1},{"type":"put","key":2,"value":2},{"type":"put","key":3,"value":3},{"type":"get","key":1},{"type":"get","key":2},{"type":"get","key":3}]}' , '[-1,2,3]', 1, 'evict first inserted', 7
    UNION ALL SELECT 'P12', '{"capacity":2,"operations":[{"type":"put","key":1,"value":1},{"type":"put","key":2,"value":2},{"type":"get","key":2},{"type":"put","key":1,"value":10},{"type":"get","key":1},{"type":"get","key":2}]}' , '[2,10,2]', 1, 'refresh on get', 8

    UNION ALL SELECT 'P13', '[[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]]', '1', 0, 'single island', 1
    UNION ALL SELECT 'P13', '[[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]', '3', 0, 'three islands', 2
    UNION ALL SELECT 'P13', '[[0,0,0],[0,0,0]]', '0', 0, 'all water', 3
    UNION ALL SELECT 'P13', '[[1]]', '1', 1, 'one cell', 4
    UNION ALL SELECT 'P13', '[[1,0,1],[0,1,0],[1,0,1]]', '5', 1, 'diagonal separation', 5
    UNION ALL SELECT 'P13', '[[1,1],[1,0]]', '1', 1, 'one connected block', 6
    UNION ALL SELECT 'P13', '[[1,0,1,1,0,1]]', '3', 1, 'row islands', 7
    UNION ALL SELECT 'P13', '[[1],[1],[0],[1]]', '2', 1, 'column islands', 8

    UNION ALL SELECT 'P14', '{"coins":[1,2,5],"amount":11}', '3', 0, 'standard change', 1
    UNION ALL SELECT 'P14', '{"coins":[2],"amount":3}', '-1', 0, 'unreachable amount', 2
    UNION ALL SELECT 'P14', '{"coins":[1],"amount":0}', '0', 0, 'zero amount', 3
    UNION ALL SELECT 'P14', '{"coins":[2,4,6],"amount":8}', '2', 1, 'two coins', 4
    UNION ALL SELECT 'P14', '{"coins":[3,7],"amount":5}', '-1', 1, 'no combination', 5
    UNION ALL SELECT 'P14', '{"coins":[1,3,4],"amount":6}', '2', 1, 'best pair', 6
    UNION ALL SELECT 'P14', '{"coins":[2,5,10,1],"amount":27}', '4', 1, 'mixed set', 7
    UNION ALL SELECT 'P14', '{"coins":[1,2,5],"amount":100}', '20', 1, 'large amount', 8

    UNION ALL SELECT 'P15', '{"board":[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"word":"ABCCED"}', 'true', 0, 'classic path', 1
    UNION ALL SELECT 'P15', '{"board":[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"word":"SEE"}', 'true', 0, 'second path', 2
    UNION ALL SELECT 'P15', '{"board":[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"word":"ABCB"}', 'false', 0, 'reuse blocked', 3
    UNION ALL SELECT 'P15', '{"board":[["A"]],"word":"A"}', 'true', 1, 'single cell', 4
    UNION ALL SELECT 'P15', '{"board":[["A","B","C"],["D","E","F"],["G","H","I"]],"word":"ABC"}', 'true', 1, 'straight row', 5
    UNION ALL SELECT 'P15', '{"board":[["A","B","C"],["D","E","F"],["G","H","I"]],"word":"AEI"}', 'false', 1, 'diagonal not allowed', 6
    UNION ALL SELECT 'P15', '{"board":[["A","B","C","E"],["S","F","E","S"],["A","D","E","E"]],"word":"ABCESEEEFS"}', 'true', 1, 'long path', 7
    UNION ALL SELECT 'P15', '{"board":[["A","B","C","E"],["S","F","E","S"],["A","D","E","E"]],"word":"ABCESEEEFSA"}', 'false', 1, 'extra letter', 8

    UNION ALL SELECT 'P16', '[[1,3],[2,6],[8,10],[15,18]]', '[[1,6],[8,10],[15,18]]', 0, 'overlap merge', 1
    UNION ALL SELECT 'P16', '[[1,4],[4,5]]', '[[1,5]]', 0, 'touching endpoints', 2
    UNION ALL SELECT 'P16', '[[1,4],[0,4]]', '[[0,4]]', 0, 'nested interval', 3
    UNION ALL SELECT 'P16', '[[1,4],[2,3]]', '[[1,4]]', 1, 'contained interval', 4
    UNION ALL SELECT 'P16', '[[1,4],[0,0]]', '[[0,0],[1,4]]', 1, 'disjoint pair', 5
    UNION ALL SELECT 'P16', '[[1,4],[5,6]]', '[[1,4],[5,6]]', 1, 'separate intervals', 6
    UNION ALL SELECT 'P16', '[[1,5],[2,3],[4,8]]', '[[1,8]]', 1, 'chain overlap', 7
    UNION ALL SELECT 'P16', '[[0,2],[3,5],[4,6],[7,9]]', '[[0,2],[3,6],[7,9]]', 1, 'mixed overlap', 8

    UNION ALL SELECT 'P17', '{"nums1":[1,3],"nums2":[2]}', '2.0', 0, 'odd total length', 1
    UNION ALL SELECT 'P17', '{"nums1":[1,2],"nums2":[3,4]}', '2.5', 0, 'even total length', 2
    UNION ALL SELECT 'P17', '{"nums1":[0,0],"nums2":[0,0]}', '0.0', 0, 'all zeros', 3
    UNION ALL SELECT 'P17', '{"nums1":[],"nums2":[1]}', '1.0', 1, 'single array', 4
    UNION ALL SELECT 'P17', '{"nums1":[2],"nums2":[]}', '2.0', 1, 'other empty array', 5
    UNION ALL SELECT 'P17', '{"nums1":[1,2,5,6],"nums2":[3,4,7,8]}', '4.5', 1, 'balanced arrays', 6
    UNION ALL SELECT 'P17', '{"nums1":[1,3,8],"nums2":[7,9,10,11]}', '8.0', 1, 'left smaller', 7
    UNION ALL SELECT 'P17', '{"nums1":[1,2,3],"nums2":[4,5,6,7,8]}', '4.5', 1, 'longer right side', 8

    UNION ALL SELECT 'P18', '[0,1,0,2,1,0,1,3,2,1,2,1]', '6', 0, 'classic basin', 1
    UNION ALL SELECT 'P18', '[4,2,0,3,2,5]', '9', 0, 'multiple basins', 2
    UNION ALL SELECT 'P18', '[1,0,2]', '1', 0, 'single pocket', 3
    UNION ALL SELECT 'P18', '[2,0,2]', '2', 1, 'simple bowl', 4
    UNION ALL SELECT 'P18', '[3,0,0,2,0,4]', '10', 1, 'wide basin', 5
    UNION ALL SELECT 'P18', '[0,0,0]', '0', 1, 'flat ground', 6
    UNION ALL SELECT 'P18', '[5,4,1,2]', '1', 1, 'sloping tail', 7
    UNION ALL SELECT 'P18', '[2,1,0,2]', '3', 1, 'small basin', 8

    UNION ALL SELECT 'P19', '{"beginWord":"hit","endWord":"cog","wordList":["hot","dot","dog","lot","log","cog"]}', '5', 0, 'standard ladder', 1
    UNION ALL SELECT 'P19', '{"beginWord":"hit","endWord":"cog","wordList":["hot","dot","dog","lot","log"]}', '0', 0, 'missing end word', 2
    UNION ALL SELECT 'P19', '{"beginWord":"a","endWord":"c","wordList":["a","b","c"]}', '2', 0, 'single character ladder', 3
    UNION ALL SELECT 'P19', '{"beginWord":"lead","endWord":"gold","wordList":["load","goad","gold","golf"]}', '4', 1, 'four step path', 4
    UNION ALL SELECT 'P19', '{"beginWord":"lost","endWord":"cost","wordList":["cost"]}', '2', 1, 'direct jump', 5
    UNION ALL SELECT 'P19', '{"beginWord":"cold","endWord":"warm","wordList":["cord","card","ward","warm","told","gold"]}', '5', 1, 'longer chain', 6
    UNION ALL SELECT 'P19', '{"beginWord":"a","endWord":"c","wordList":["a","b"]}', '0', 1, 'unreachable end', 7
    UNION ALL SELECT 'P19', '{"beginWord":"hit","endWord":"hot","wordList":["hot"]}', '2', 1, 'one edit away', 8

    UNION ALL SELECT 'P20', '[1,2,3,null,null,4,5]', '[1,2,3,null,null,4,5]', 0, 'balanced tree', 1
    UNION ALL SELECT 'P20', '[1,null,2,3]', '[1,null,2,3]', 0, 'right leaning tree', 2
    UNION ALL SELECT 'P20', '[5,3,7,2,4,6,8]', '[5,3,7,2,4,6,8]', 0, 'full tree', 3
    UNION ALL SELECT 'P20', '[1]', '[1]', 1, 'single node', 4
    UNION ALL SELECT 'P20', '[]', '[]', 1, 'empty tree', 5
    UNION ALL SELECT 'P20', '[1,2]', '[1,2]', 1, 'missing right child', 6
    UNION ALL SELECT 'P20', '[1,null,2,null,3]', '[1,null,2,null,3]', 1, 'right chain', 7
    UNION ALL SELECT 'P20', '[1,2,3,4,5,null,7]', '[1,2,3,4,5,null,7]', 1, 'sparse lower level', 8
) AS tc
JOIN tmp_seed_problem_ids AS ids ON ids.code = tc.code;

DROP TEMPORARY TABLE tmp_seed_problem_ids;

COMMIT;