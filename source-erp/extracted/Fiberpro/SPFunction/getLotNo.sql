/*  
;=============================================  
; Author            :  Global Software's  
; Create date       :  07/02/2015  
; Create By         :  ASLAM
; Description       :  Get First Numeric Digit from Alpahnumeric
; Change Person     :  ASLAM   
; Last Change Date  :  09/02/2015 12.45 PM
; =============================================   */
create FUNCTION getLotNo(@s VARCHAR(50))  
RETURNS int AS 
BEGIN

set @s = substring(@s,patindex('%[0-9]%',@s),len(@s)-patindex('%[0-9]%',@s) + 1) 
if patindex('%[^0-9]%',@s) = 0
    return @s
set @s = substring(@s,1,patindex('%[^0-9]%',@s)-1) 

return cast(@s as int)
end
--test
/*
drop function GetFirstNumeric_old
select getFirstNumeric('asd11')


Select * from spupdate
delete from spupdate */