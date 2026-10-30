import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const studentSchema = new Schema(
    {
        schoolId: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        className: {
            type: String,
            trim: true,
            maxlength: 50
        },

        // Parent accounts allowed to see this student's van.
        parentIds: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],

        // Direct assignment used by the current implementation.
        assignedVanId: {
            type: Schema.Types.ObjectId,
            ref: 'Van',
            default: null,
            index: true
        },

        isActive: {
            type: Boolean,
            default: true,
            required: true
        }
    },
    { timestamps: true }
);

// Efficient lookup for parent + van authorization.
studentSchema.index({
    schoolId: 1,
    parentIds: 1,
    assignedVanId: 1,
    isActive: 1
});

const Student = models.Student || model('Student', studentSchema);

export default Student;