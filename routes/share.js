const express = require('express');
const router = express.Router();
const client = require('../db');
const USER_COOKIE_KEY = 'USER';

async function queryAsync(query, params) {
    return new Promise((resolve, reject) => {
        client.query(query, params, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

async function fetchUser(user_id) {
    console.log("Querying database for user with id:", user_id);
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM user WHERE user_id = ?', [user_id], (err, results) => {
            if (err) {
                return reject(err); 
            }
            resolve(results[0]);
        });
    });
}

router.get('/currentUserId', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];
    if (!userCookie) {
        return res.status(401).json({ msg: 'Not authenticated' });
    }

    const userData = JSON.parse(userCookie);
    const userId = userData.user_id;

    try {
        res.status(200).json({ user_id: userId });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로잉 전체 수 가져오기
router.get('/followingCount', async (req, res) => {
    const userId = req.query.userId;

    try {
        const query = 'SELECT COUNT(*) AS totalFollowing FROM follow WHERE from_user_id = ?';
        const results = await queryAsync(query, [userId]);

        res.status(200).json({ totalFollowing: results[0].totalFollowing });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로워 전체 수 가져오기
router.get('/followersCount', async (req, res) => {
    const userId = req.query.userId;

    try {
        const query = 'SELECT COUNT(*) AS totalFollowers FROM follow WHERE to_user_id = ?';
        const results = await queryAsync(query, [userId]);

        res.status(200).json({ totalFollowers: results[0].totalFollowers });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로잉 리스트 가져오기 (페이지네이션)
router.get('/followingList', async (req, res) => {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const query = 'SELECT to_user_id FROM follow WHERE from_user_id = ? LIMIT ? OFFSET ?';
        const results = await queryAsync(query, [userId, limit, offset]);

        const countQuery = 'SELECT COUNT(*) AS total FROM follow WHERE from_user_id = ?';
        const countResults = await queryAsync(countQuery, [userId]);

        const userIds = results.map(row => row.to_user_id);
        const totalPages = Math.ceil(countResults[0].total / limit);

        res.status(200).json({ followingList: userIds, totalPages });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로워 리스트 가져오기 (페이지네이션)
router.get('/followersList', async (req, res) => {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const query = 'SELECT from_user_id FROM follow WHERE to_user_id = ? LIMIT ? OFFSET ?';
        const results = await queryAsync(query, [userId, limit, offset]);

        const countQuery = 'SELECT COUNT(*) AS total FROM follow WHERE to_user_id = ?';
        const countResults = await queryAsync(countQuery, [userId]);

        const userIds = results.map(row => row.from_user_id);
        const totalPages = Math.ceil(countResults[0].total / limit);

        res.status(200).json({ followersList: userIds, totalPages });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로워 삭제하기
router.post('/removeFollower', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];
    if (!userCookie) {
        return res.status(401).json({ msg: 'Not authenticated' });
    }
    const to_user_id = JSON.parse(userCookie).user_id; // 현재 사용자의 ID
    const { from_user_id } = req.body; // 삭제할 팔로워의 ID

    try {
        const follower = await fetchUser(from_user_id);
        const following = await fetchUser(to_user_id);

        if (!follower || !following) {
            return res.status(400).json({ msg: 'User not found' });
        }

        const query = 'DELETE FROM follow WHERE from_user_id = ? AND to_user_id = ?';
        await queryAsync(query, [from_user_id, to_user_id]);

        console.log("Follower removed successfully");
        res.status(200).json({ msg: 'Follower removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 언팔로우하기
router.post('/unfollow', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];
    if (!userCookie) {
        return res.status(401).json({ msg: 'Not authenticated' });
    }
    const from_user_id = JSON.parse(userCookie).user_id;
    const { to_user_id } = req.body;

    try {
        const follower = await fetchUser(from_user_id);
        const following = await fetchUser(to_user_id);

        if (!follower || !following) {
            return res.status(400).json({ msg: 'User not found' });
        }

        const query = 'DELETE FROM follow WHERE from_user_id = ? AND to_user_id = ?';
        await queryAsync(query, [from_user_id, to_user_id]);

        console.log("Unfollowed successfully");
        res.status(200).json({ msg: 'Unfollowed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 맞팔로우 상태 확인
router.get('/checkMutualFollow', async (req, res) => {
    const { currentUserId, targetUserId } = req.query;

    try {
        const query = `SELECT * FROM follow WHERE from_user_id = ? AND to_user_id = ?`;
        const results = await queryAsync(query, [targetUserId, currentUserId]);
        const mutualFollow = results.length > 0;

        res.json({ mutualFollow });
    } catch (error) {
        console.error('Error checking mutual follow status:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;