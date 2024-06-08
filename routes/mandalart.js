const express = require('express');
const router = express.Router();
const client = require('../db'); // MySQL 클라이언트 사용
const { v4: uuidv4 } = require('uuid'); // UUID 생성기

// 메인 만다라트 경로
router.get('/', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        client.query("SELECT * FROM mandalart WHERE user_id = ?", [user.user_id], (err, mandalartResult) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                if (mandalartResult.length > 0) {
                    const mandalartId = mandalartResult[0].mandalart_id;
                    res.redirect(`/mandalart/view/${mandalartId}`);
                } else {
                    res.redirect('/mandalart/create');
                }
            }
        });
    } else {
        res.redirect('/signin');
    }
});

// 만다라트 생성 페이지 (GET)
router.get('/create', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        res.render('createMandalart', { title: 'Create Mandalart', user });
    } else {
        res.redirect('/signin');
    }
});

// 만다라트 저장 및 조회 페이지로 리디렉션
router.get('/saveMandalart', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        client.query("SELECT * FROM mandalart WHERE user_id = ?", [user.user_id], (err, mandalartResult) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                if (mandalartResult.length > 0) {
                    const mandalartId = mandalartResult[0].mandalart_id;
                    res.redirect(`/mandalart/view/${mandalartId}`);
                } else {
                    res.redirect('/mandalart/create');
                }
            }
        });
    } else {
        res.redirect('/signin');
    }
});

// 만다라트 조회 페이지
router.get('/view/:mandalartId', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const { mandalartId } = req.params;

    if (user) {
        client.query("SELECT * FROM mandalart WHERE mandalart_id = ?", [mandalartId], (err, mandalartResult) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                if (mandalartResult.length > 0) {
                    client.query("SELECT * FROM tedolist WHERE mandalart_id = ?", [mandalartId], (err, tedolistResult) => {
                        if (err) {
                            console.log(err);
                            res.status(500).send("Server error");
                        } else {
                            const tedolistIds = tedolistResult.map(tedolist => tedolist.tedolist_number);
                            if (tedolistIds.length > 0) {
                                client.query("SELECT * FROM checklist WHERE mandalart_id = ? AND tedolist_number IN (?)", [mandalartId, tedolistIds], (err, checklistResult) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(500).send("Server error");
                                    } else {
                                        const checklists = checklistResult.reduce((acc, checklist) => {
                                            if (!acc[checklist.tedolist_number]) {
                                                acc[checklist.tedolist_number] = [];
                                            }
                                            acc[checklist.tedolist_number].push(checklist);
                                            return acc;
                                        }, {});
                                        res.render("viewMandalart", { 
                                            title: 'View Mandalart', 
                                            mandalart: mandalartResult[0], 
                                            tedolists: tedolistResult, 
                                            checklists 
                                        });
                                    }
                                });
                            } else {
                                const checklists = {};
                                res.render("viewMandalart", { 
                                    title: 'View Mandalart', 
                                    mandalart: mandalartResult[0], 
                                    tedolists: tedolistResult, 
                                    checklists 
                                });
                            }
                        }
                    });
                } else {
                    res.status(404).send("Mandalart not found");
                }
            }
        });
    } else {
        res.redirect('/signin');
    }
});

// 만다라트 생성 처리
router.post('/create', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        const { centergoal, tedolistCount } = req.body;
        const mandalartId = uuidv4(); 
        client.query("INSERT INTO mandalart (mandalart_id, user_id, centergoal, tedolist_count) VALUES (?, ?, ?, ?)", 
            [mandalartId, user.user_id, centergoal, tedolistCount],
            (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Server error");
                } else {
                    res.redirect(`/mandalart/edit/${mandalartId}`);
                }
            }
        );
    } else {
        res.redirect('/signin');
    }
});

// 테두리스트 추가 처리
router.post('/addTedolist', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        const { mandalartId, tedolistDetails } = req.body;
        client.query("SELECT COALESCE(MAX(tedolist_number), 0) + 1 AS new_tedolist_number FROM tedolist WHERE mandalart_id = ?", [mandalartId], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                let tedolist_number = result[0].new_tedolist_number; 
                const detailsArray = tedolistDetails.split(',').map(detail => detail.trim()).filter(detail => detail.length > 0); 
                const values = detailsArray.map(detail => [tedolist_number++, mandalartId, detail]);
                client.query("INSERT INTO tedolist (tedolist_number, mandalart_id, tedolist_detail) VALUES ?", 
                    [values],
                    (err, result) => {
                        if (err) {
                            console.log(err);
                            res.status(500).send("Server error");
                        } else {
                            res.redirect(`/mandalart/edit/${mandalartId}`); // Edit 페이지에 머물도록 수정
                        }
                    }
                );
            }
        });
    } else {
        res.redirect('/signin');
    }
});

// 체크리스트 추가 처리
router.post('/addChecklist', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const today = new Date();
    const date = today.toISOString().split('T')[0];

    if (user) {
        const { mandalart_id, tedolistNumber, checklistDetail } = req.body;
        client.query("INSERT INTO checklist (mandalart_id, tedolist_number, checklist_detail, imogi, date, is_checked) VALUES (?, ?, ?, ?, ?, ?)", 
            [mandalart_id, tedolistNumber, checklistDetail, "", date, false],
            (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Server error");
                } else {
                    res.json({ success: true });
                }
            }
        );
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// 만다라트 저장 및 조회 페이지로 리디렉션 (POST 요청 처리)
router.post('/saveMandalart', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const { mandalartId } = req.body;

    if (user) {
        res.redirect(`/mandalart/view/${mandalartId}`);
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// 만다라트 편집 페이지 (테두리스트 추가)
router.get('/edit/:mandalartId', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const { mandalartId } = req.params;

    if (user) {
        client.query("SELECT * FROM mandalart WHERE mandalart_id = ?", [mandalartId], (err, mandalartResult) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                if (mandalartResult.length > 0) {
                    client.query("SELECT * FROM tedolist WHERE mandalart_id = ?", [mandalartId], (err, tedolistResult) => {
                        if (err) {
                            console.log(err);
                            res.status(500).send("Server error");
                        } else {
                            const tedolistIds = tedolistResult.map(tedolist => tedolist.tedolist_number);
                            if (tedolistIds.length > 0) {
                                client.query("SELECT * FROM checklist WHERE mandalart_id = ? AND tedolist_number IN (?)", [mandalartId, tedolistIds], (err, checklistResult) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(500).send("Server error");
                                    } else {
                                        const checklists = checklistResult.reduce((acc, checklist) => {
                                            if (!acc[checklist.tedolist_number]) {
                                                acc[checklist.tedolist_number] = [];
                                            }
                                            acc[checklist.tedolist_number].push(checklist);
                                            return acc;
                                        }, {});
                                        res.render("editMandalart", {
                                            title: 'Edit Mandalart',
                                            mandalart: mandalartResult[0],
                                            tedolists: tedolistResult,
                                            checklists
                                        });
                                    }
                                });
                            } else {
                                const checklists = {};
                                res.render("editMandalart", {
                                    title: 'Edit Mandalart',
                                    mandalart: mandalartResult[0],
                                    tedolists: tedolistResult,
                                    checklists
                                });
                            }
                        }
                    });
                } else {
                    res.status(404).send("Mandalart not found");
                }
            }
        });
    } else {
        res.redirect('/signin');
    }
});

// 만다라트 수정 처리 (POST)
router.post('/update/:mandalartId', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const { mandalartId } = req.params;
    const { tedolistDetails } = req.body;

    if (user) {
        // Update only the tedolist details
        const detailsArray = tedolistDetails.map(detail => [detail.tedolist_number, detail.tedolist_detail]);
        const updateQueries = detailsArray.map(([tedolist_number, tedolist_detail]) => {
            return new Promise((resolve, reject) => {
                client.query("UPDATE tedolist SET tedolist_detail = ? WHERE mandalart_id = ? AND tedolist_number = ?", [tedolist_detail, mandalartId, tedolist_number], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        });

        Promise.all(updateQueries).then(() => {
            res.redirect(`/mandalart/view/${mandalartId}`);
        }).catch(err => {
            console.log(err);
            res.status(500).send("Server error");
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// 만다라트 삭제 처리
router.post('/delete/:mandalartId', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const { mandalartId } = req.params;

    if (user) {
        client.query("DELETE FROM mandalart WHERE mandalart_id = ? AND user_id = ?", [mandalartId, user.user_id], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                res.redirect('/');
            }
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// Checklist 삭제 처리
router.delete('/deleteChecklist/:checklistId', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const { checklistId } = req.params;

    if (user) {
        client.query("DELETE FROM checklist WHERE checklist_id = ?", [checklistId], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                res.status(200).json({ success: true });
            }
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// 특정 유저의 만다라트를 가져오는 API
router.get('/userMandalart/:userId', (req, res) => {
    const { userId } = req.params;

    client.query("SELECT * FROM mandalart WHERE user_id = ?", [userId], (err, mandalartResult) => {
        if (err) {
            console.log(err);
            res.status(500).send("Server error");
        } else {
            if (mandalartResult.length > 0) {
                const mandalart = mandalartResult[0];
                client.query("SELECT * FROM tedolist WHERE mandalart_id = ?", [mandalart.mandalart_id], (err, tedolistResult) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send("Server error");
                    } else {
                        const tedolistIds = tedolistResult.map(tedolist => tedolist.tedolist_number);
                        if (tedolistIds.length > 0) {
                            client.query("SELECT * FROM checklist WHERE mandalart_id = ? AND tedolist_number IN (?)", [mandalart.mandalart_id, tedolistIds], (err, checklistResult) => {
                                if (err) {
                                    console.log(err);
                                    res.status(500).send("Server error");
                                } else {
                                    const checklists = checklistResult.reduce((acc, checklist) => {
                                        if (!acc[checklist.tedolist_number]) {
                                            acc[checklist.tedolist_number] = [];
                                        }
                                        acc[checklist.tedolist_number].push(checklist);
                                        return acc;
                                    }, {});
                                    res.json({ mandalart, tedolists: tedolistResult, checklists });
                                }
                            });
                        } else {
                            const checklists = {};
                            res.json({ mandalart, tedolists: tedolistResult, checklists });
                        }
                    }
                });
            } else {
                res.status(404).json({ message: "No Mandalart found for this user" });
            }
        }
    });
});

// 캘린더 관련 코드 추가
// 특정 날짜의 테두리스트와 체크리스트를 가져오는 API
router.get('/details/:date', (req, res) => {
    const { date } = req.params;
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        const query = `
            SELECT t.tedolist_number, t.tedolist_detail, c.checklist_detail, c.is_checked
            FROM calendar cal
            JOIN tedolist t ON cal.tedolist_number = t.tedolist_number AND cal.mandalart_id = t.mandalart_id
            JOIN checklist c ON cal.checklist_id = c.checklist_id AND cal.mandalart_id = c.mandalart_id
            JOIN mandalart m ON cal.mandalart_id = m.mandalart_id
            WHERE cal.date = ? AND cal.user_id = ?
        `;

        client.query(query, [date, user.user_id], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ error: 'Database query error' });
            }

            const tedolist = results.map(row => ({
                tedolist_number: row.tedolist_number,
                detail: row.tedolist_detail
            }));
            const checklist = results.map(row => ({
                detail: row.checklist_detail,
                is_checked: row.is_checked
            }));

            res.json({ tedolist, checklist });
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

//체크리스트 목록 보여주기
router.get('/checklists/:mandalartId/:tedolistNumber', (req, res) => {
    const { mandalartId, tedolistNumber } = req.params;
    client.query("SELECT * FROM checklist WHERE mandalart_id = ? AND tedolist_number = ?", [mandalartId, tedolistNumber], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Server error");
        } else {
            res.json(result);
        }
    });
});

module.exports = router;
