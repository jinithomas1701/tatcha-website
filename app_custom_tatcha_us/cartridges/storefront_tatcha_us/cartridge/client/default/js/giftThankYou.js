$(document).ready(function(){
    setTimeout(function(){
       $('#thankyouNote').modal('show');
    }, 1000);
});

$(document).on('click', '#send_thankyou_btn', function(e){
    e.preventDefault();
    var hasError = false;
    if($('#thankYouMessage').val().length === 0) {
        hasError = true;
        $('#thankYouMessage').closest('.form-group').addClass('has-error');
        $('#thankYouMessage').siblings('.help-block').show();
    }
    if(!hasError) {
        var url = $(this).closest('form').attr('action');
        var form = $(this).closest('form').serialize();

        $('.loader-preventive').show();

        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: form,
            success: function(data) {
                if(data.status == true) {
                    $('#thankyouNote .modal-dialog .modal-content #thankyou_form').hide();
                    $('#thankyouNote .modal-dialog .modal-content #alert-thankyou').show();
                
                $('.loader-preventive').hide();        
                }
            }
        });
    }
});