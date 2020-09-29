const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check,validationResult } = require('express-validator');
const request = require('request');
const config = require('config');

const Profile = require('../../models/Profile');
const User = require('../../models/user');
const Post = require('../../models/Post');

//route :GET api/profile/me
//Desc :get current users profile
//access :Private

router.get('/me',auth, async(req,res) => {
    try {
        const profile = await  Profile.findOne({ user:req.user.id }).populate('user',['name','avatar']);
        if(!profile){
            return res.status(400).json({msg:' There is no profile for this user'})
        }
        res.send(profile)
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

//route :post api/profile
//Desc :create or update user profile
//access :Private

router.post('/',
    [
        auth,
        [
          check('status','status is required').not().isEmpty(),
          check('skills','skills is required').not().isEmpty()
        ]
    ],
    async(req,res)=>{
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors:errors.array()});
        }
        const {
            company,
            website,
            location,
            bio,
            status,
            githubusername,
            skills,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin
        } = req.body;

        //Build the profile object
        const profileFields = {};
        profileFields.user = req.user.id;
        if(company) profileFields.company = company;
        if(website) profileFields.website = website;
        if(location) profileFields.location = location;
        if(bio) profileFields.bio = bio;
        if(status) profileFields.status = status;
        if(githubusername) profileFields.githubusername = githubusername;
        if(skills){
            const skillString = skills;
            profileFields.skills = skillString.split(",").map(skill=>skill.trim());
        }

        //Build social object
        profileFields.social = {};
        if(youtube) profileFields.social.youtube = youtube;
        if(twitter) profileFields.social.twitter = twitter;
        if(facebook) profileFields.social.facebook = facebook;
        if(linkedin) profileFields.social.linkedin = linkedin;
        if(instagram) profileFields.social.instagram = instagram;

         try {
             let profile = await Profile.findOne({ user:req.user.id });
             if(profile){
                 //update
                 profile = await Profile.findOneAndUpdate(
                     { user: req.user.id },
                     { $set:profileFields},
                     { new: true}
                     )
                     return res.json(profile);
             }
             //create
             profile = new Profile(profileFields);
             await profile.save();
             res.status(200).json(profile)
             
         } catch (err) {
             console.error(err.message);
             res.status(500).json('Server error')
         }
      
    })

//route :Get api/profile
//Desc :Get alll profile
//access :public

router.get('/', async(req,res)=>{
    try {
        const profiles = await Profile.find().populate('user',['name','avatar']);
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server Error');
    }
})

//route :Get api/profile/user/user_id
//Desc :Get  profile by user id
//access :public

router.get('/user/:user_id', async(req,res)=>{
    try {
        const profiles = await Profile.findOne({user:req.params.user_id}).populate('user',['name','avatar']);
        if(!profiles){
            return res.status(400).json({msg:'Profile not found'})
        }
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        if(err.kind == 'ObjectId'){
            return res.status(400).json({msg:'Profile not found'})
        }
        res.status(500).json('Server Error');
    }
})

//route :Delete api/profile
//Desc : Delete profile,user and posts
//access :private

router.delete('/',auth, async(req,res)=>{
    try {
        //Remove user posts
        await Post.deleteMany({ user:req.user.id });

        //Reomove profile
        await Profile.findOneAndRemove({user:req.user.id});
        //Remove user
        await User.findOneAndRemove({_id:req.user.id});
        
        res.json('User removed');
    } catch (err) {
        console.error(err.message);
        if(err.kind == 'ObjectId'){
            return res.status(400).json({msg:'Profile not found'})
        }
        res.status(500).json('Server Error');
    }
})

//route :PUT api/profile/experience
//Desc : Add profile experience
//access :private

router.put('/experience', [auth,
    [
        check('title','Title is required').not().isEmpty(),
        check('company','Company is required').not().isEmpty(),
        check('from','From date is required').not().isEmpty(),
    ]
], async(req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
    const { 
        title,
        company,
        location,
        from,
        to,
        current,
        description
     } = req.body;

     const newExp = {
         title,
         company,
         location,
         from,
         to,
         current,
         description
     }

     try {
         const profile = await Profile.findOne({user:req.user.id});

         profile.experience.unshift(newExp);
         await profile.save();

         res.json(profile);
         
     } catch (err) {
         console.error(err.message);
         res.status(500).json('Server Error');
     }
});

//route :PUT api/profile/experience/:exp_id
//Desc :delete exp from profile
//access :private

router.delete('/experience/:exp_id',auth,async(req,res)=>{
    try {
        const profile = await Profile.findOne({user:req.user.id});

        //Get remove index
        const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
        profile.experience.splice(removeIndex, 1);
        await profile.save();
        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server error');
    }
});


//route :PUT api/profile/education
//Desc : Add profile education
//access :private

router.put('/education', [auth,
    [
        check('school','School is required').not().isEmpty(),
        check('degree','Degree is required').not().isEmpty(),
        check('from','From date is required').not().isEmpty(),
        check('fieldofstudy','Field of study is required').not().isEmpty(),
    ]
    ], async(req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
    const { 
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
     } = req.body;

     const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
     }

     try {
         const profile = await Profile.findOne({user:req.user.id});

         profile.education.unshift(newEdu);
         await profile.save();

         res.json(profile);
         
     } catch (err) {
         console.error(err.message);
         res.status(500).json('Server Error');
     }
});

//route :PUT api/profile/education/:exp_id
//Desc :delete education from profile
//access :private

router.delete('/education/:edu_id',auth,async(req,res)=>{
    try {
        const profile = await Profile.findOne({user:req.user.id});

        //Get remove index
        const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);
        profile.education.splice(removeIndex,1);
        await profile.save();
        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server error');
    }
});

//route :GEt api/profile/github/:username
//Desc :Get user repo from github
//access :public

router.get('/github/:username', (req,res)=>{
    try {
        const options = {
           uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&clientSecret=${config.get('githubSecret')}`,
           method:'GET',
           headers:{'user-agent':'node.js'}
        }
        request(options,(err,response,body)=>{
            if(err) console.error(err);

            if(response.statusCode !=200){
                return res.status(404).json({msg:"No github account found"})
            }

            res.json(JSON.parse(body));
        })
    } catch (err) {
        console.error(err.message);
        res.status(500).json('Server error');
    }
});



module.exports = router;